var name = {}

name.translate = function (portfolioProject, projectOnlineProject) {
  var projectName = projectOnlineProject['ProjectName']

  var index = projectName.indexOf('_')
  if (projectName && index !== -1) {
    projectName = projectName.substr(0, index)
  }

  portfolioProject.name = projectName
}

module.exports = name
