var cost = {}

cost.translate = function (portfolioProject, projectOnlineProject) {
  var projectCost = projectOnlineProject['ProjectActualCost']
  if (projectCost) {
    projectCost = parseFloat(projectCost)
    if (projectCost > 0) {
      portfolioProject.cost = '£' + projectCost.toFixed(2).toString()
    }
  }
}

module.exports = cost
