var fs = require('fs')
var _ = require('underscore')
var merge = require('merge')
var csomapi = require('csom-node')
var o = require('odata')
var path = require('path')
var config = JSON.parse(fs.readFileSync(path.join(__dirname, '/config.json')))
var moment = require('moment')
var massive = require('massive')
var express = require('express')
var app = express()

var load = {}

var defaultProjectSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '/../lib/projects/defaults.js')).toString())

var settings = {
  url: process.env.PROJECT_ONLINE_URL.toString(),
  projectSite: process.env.PROJECT_ONLINE_SITE.toString(),
  projectFilter: process.env.PROJECT_ONLINE_FILTER.toString(),
  username: process.env.PROJECT_ONLINE_USERNAME,
  password: process.env.PROJECT_ONLINE_PASSWORD,
  databaseUrl: process.env.DATABASE_URL
}

var dbInstance = massive.connectSync({connectionString: settings.databaseUrl})
app.set('db', dbInstance)

/*
  Get the last time the projects were updated.
*/
load.getLastUpdateTime = function () {
  return new Promise(function (resolve, reject) {
    var lastUpdateTime
    var db = app.get('db')
    db.defra.config.find({key: 'lastUpdateTime'}, function (err, result) {
      if (err) throw err

      if (result && result.length > 0) {
        lastUpdateTime = result[0].value
      } else {
        var date = moment()
        lastUpdateTime = date.format('Do MMMM YYYY') + ' at ' + date.format('HH:mm')
      }

      resolve(lastUpdateTime)
    })
  })
}

/*
  Load all the project data from the database.
*/
load.getProjects = function () {
  return new Promise(function (resolve, reject) {
    var projects = []
    var db = app.get('db')
    db.defra.project.find({'project_json <>': null}, function (err, results) {
      if (err) reject(err)

      _.forEach(results, function (result) {
        projects.push(JSON.parse(result['project_json']))
      })

      resolve(projects)
    })
  })
}

/*
  Update project data from Project Online.
*/
load.updateProjects = function () {
  console.log('Starting update...')

  // Get the current portfolio projects
  load.getProjects()
    .then(portfolioProjects => {
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
        var oHandler = o(settings.url + 'sites/' + settings.projectSite + '/_api/Projectdata/Projects()')
        oHandler.filter("ProjectType ne 7 and ProjectStatus eq 'Active'" + (settings.projectFilter ? ' and ' + settings.projectFilter : ''))
        oHandler.orderBy('ProjectName')

        oHandler.get(function (projects) {
          projectOnlineCount = projects.length

          _.forEach(projects, function (project) {
            // Filter out any projects starting with 'x_'
            if (!project.ProjectName.startsWith('x_')) {
              // Setup the OData handler to retrieve all task details for a project
              oHandler = o(settings.url + 'sites/' + settings.projectSite + '/_api/Projectdata/Tasks()')
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
            } else {
              projectOnlineCount--
            }
          })
        })
      })
    })
    .catch(err => {
      throw err
    })
}

/*
  Updates the portfolioProjects array with the details in the projectOnlineProjects array.
  If no match can be found for a project in the array of portfolio projects then a new
  project file is created.
*/
function _updateProjects (portfolioProjects, projectOnlineProjects) {
  console.log('Updating projects...')

  var db = app.get('db')

  // Get the ID fields used in each array of projects
  var projectOnlineIdField = config.projectOnlineIdField

  _.forEach(projectOnlineProjects, function (projectOnlineProject, index) {
    // Try and find a matching portfolio project
    var portfolioProject = _.findWhere(portfolioProjects, {portfolioIdField: projectOnlineProject[projectOnlineIdField]})

    // Create a translated version and merge with the default portfolio project schema
    var translatedOnlineProject = _translatedOnlineProject(projectOnlineProject)
    translatedOnlineProject = merge(true, defaultProjectSchema, translatedOnlineProject)

    // Perform an update or create a new project
    if (portfolioProject) {
      portfolioProject = merge(true, portfolioProject, translatedOnlineProject)
    } else {
      translatedOnlineProject.id = index
      portfolioProject = translatedOnlineProject
    }

    // Write the portfolio project to the database
    var projectId = portfolioProject[config.portfolioIdField]
    var project = {
      project_id: projectId,
      project_json: JSON.stringify(portfolioProject)
    }
    db.defra.project.find({project_id: projectId}, function (findErr, findResult) {
      if (findErr) throw findErr

      if (findResult && findResult.length > 0) {
        db.defra.project.update(project, function (updateErr, updateResult) {
          if (updateErr) throw updateErr
        })
      } else {
        db.defra.project.insert(project, function (insertErr, insertResult) {
          if (insertErr) throw insertErr
        })
      }
    })
  })

  var lastUpdateTime = {
    key: 'lastUpdateTime'
  }
  db.defra.config.find(lastUpdateTime, function (err, result) {
    if (err) throw err

    var date = moment()
    lastUpdateTime.value = date.format('Do MMMM YYYY') + ' at ' + date.format('HH:mm')

    if (result && result.length > 0) {
      db.defra.config.update(lastUpdateTime, function (err, updateResult) {
        if (err) throw err
      })
    } else {
      db.defra.config.insert(lastUpdateTime, function (err, insertResult) {
        if (err) throw err
      })
    }
  })

  console.log('Completed update.')
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
