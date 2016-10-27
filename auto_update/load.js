var fs = require('fs')
var _ = require('underscore')
var merge = require('merge')
var csomapi = require('csom-node')
var o = require('odata')
var path = require('path')
var config = JSON.parse(fs.readFileSync(path.join(__dirname, '/config.json')))

var load = {}

var defaultProjectSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '/../lib/projects/defaults.js')).toString())

var settings = {
  url: process.env.PROJECT_ONLINE_URL.toString(),
  username: process.env.PROJECT_ONLINE_USERNAME,
  password: process.env.PROJECT_ONLINE_PASSWORD
}

/*
  Load all the project data from the files.
*/
load.getProjects = function () {
  // Get all the project files
  var files = fs.readdirSync(path.join(__dirname, '/../lib/projects/'))

  // Read each file and merge with the default project schema
  var projects = []
  _.each(files, function (el) {
    if (el === 'defaults.js') return
    var file = fs.readFileSync(path.join(__dirname, '/../lib/projects/' + el)).toString()
    try {
      var json = merge(true, defaultProjectSchema, JSON.parse(file))
      json.filename = el
      projects.push(json)
    } catch (err) {
      console.log(err)
    }
  })
  return projects
}

/*
  Update project data from Project Online.
*/
load.updateProjects = function () {
  console.log('Starting update...')

  // Get the current portfolio projects
  var portfolioProjects = load.getProjects()

  // Set the base Sharepoint URL to authenticate against
  csomapi.setLoaderOptions({
    url: settings.url
  })

  // Get the authentication token for use in all OData calls
  var authCtx = new csomapi.AuthenticationContext(settings.url)
  authCtx.acquireTokenForUser(settings.username, settings.password, function (err, data) {
    if (err) throw err

    // Setup config for the OData requests;
    // include the O365 authentication in the header
    o().config({
      error: function (status, message) {
        console.error(status + ': ' + message)
      },
      headers: [{
        name: 'cookie',
        value: 'FedAuth=' + authCtx.FedAuth + '; rtFa=' + authCtx.rtFa
      }]
    })

    var projectOnlineProjects = []
    var projectOnlineCount = 0
    var count = 0

    // Setup the OData handler to retrieve all project details
    var oHandler = o('https://envagency.sharepoint.com/sites/pwa/_api/Projectdata/Projects()')
    oHandler.filter("ProjectType ne 7 and EnterpriseProjectTypeName eq 'CIS Project' and ProjectStatus eq 'Active' and Changecategory eq 'Digital public services'")
    oHandler.orderBy('ProjectName')

    oHandler.get(function (projects) {
      projectOnlineCount = projects.length

      _.forEach(projects, function (project) {
        // Setup the OData handler to retrieve all task details for a project
        oHandler = o('https://envagency.sharepoint.com/sites/pwa/_api/Projectdata/Tasks()')
        oHandler.filter("ProjectId eq guid'" + project.ProjectId + "' and (TaskName eq 'Discovery' or TaskName eq 'Alpha phase' or TaskName eq 'Beta phase' or TaskName eq 'Move to Live')")

        oHandler.get(function (tasks) {
          project.Tasks = []

          // Store the start and finish date for each task
          _.forEach(tasks, function (task) {
            project.Tasks.push({
              TaskName: task.TaskName,
              TaskStartDate: task.TaskStartDate,
              TaskFinishDate: task.TaskFinishDate
            })
          })

          projectOnlineProjects.push(project)
          count++

          // Update the projects once all the projects' tasks have been returned
          if (count === projectOnlineCount) {
            console.log('Finished getting projects and tasks from Project Online')
            _updateProjects(portfolioProjects, projectOnlineProjects)
          }
        })
      })
    })
  })
}

/*
  Updates the portfolioProjects array with the details in the projectOnlineProjects array.
  If no match can be found for a project in the array of portfolio projects then a new
  project file is created.
*/
function _updateProjects (portfolioProjects, projectOnlineProjects) {
  console.log('Updating project files')

  // Get the ID fields used in each array of projects
  // var portfolioIdField = config.portfolioIdField
  var projectOnlineIdField = config.projectOnlineIdField

  _.forEach(projectOnlineProjects, function (projectOnlineProject, index) {
    // Try and find a matching portfolio project
    var portfolioProject = _.findWhere(portfolioProjects, {portfolioIdField: projectOnlineProject[projectOnlineIdField]})

    // Set the filename to be used when saving the project details
    var filename = ''
    if (portfolioProject) {
      filename = portfolioProject.filename
    }
    if (filename === '') {
      filename = _getFilename(projectOnlineProject[config.filenameField])
    }

    // Create a translated version and merge with the default portfolio project schema
    var translatedOnlineProject = _translatedOnlineProject(projectOnlineProject)
    translatedOnlineProject = merge(true, defaultProjectSchema, translatedOnlineProject)

    // Perform an update or create a new project file
    if (portfolioProject) {
      portfolioProject = merge(true, portfolioProject, translatedOnlineProject)
    } else {
      translatedOnlineProject.id = index
      portfolioProject = translatedOnlineProject
    }

    // Remove the filename parameter before saving
    if (portfolioProject.filename) {
      delete portfolioProject.filename
    }

    // Write the portfolio project to disk
    filename = path.join(__dirname, '/../lib/projects/', filename)
    fs.writeFile(filename, JSON.stringify(portfolioProject, null, 2), function (err) {
      if (err) throw err
    })
  })

  console.log('Completed update')
}

/*
  Returns a filename given a project name.
*/
function _getFilename (projectName) {
  var filename = []
  var split = projectName.split(' ')
  _.forEach(split, function (s) {
    var first = s.substr(0, 1).toLowerCase()
    if (first !== '(' && first !== ')') {
      filename.push(first)
    }
  })
  return filename.join('') + '.js'
}

/*
  Translates the online project to a portfolio project.
*/
function _translatedOnlineProject (projectOnlineProject) {
  // Create a clone of the default portfolio template
  var translated = merge(true, defaultProjectSchema)

  // For each field in the config get the attribute value
  _.forEach(config.fieldMap, function (fieldMap) {
    var translator = fieldMap.translator

    if (translator === undefined) {
      // The field doesn't require special translation
      translated[fieldMap.portfolio] = projectOnlineProject[fieldMap.projectOnline]
    } else {
      // The field requires special translation
      // Use the 'translate' method to set the correct value
      var translate = require(path.join(__dirname, '/translate/' + translator + '.js'))
      translate.translate(translated, projectOnlineProject)
    }
  })
  return translated
}

module.exports = load
