var _ = require('underscore')
var moment = require('moment')

var history = {}

history.translate = function (portfolioProject, projectOnlineProject) {
  var projectHistory = portfolioProject['phase-history']
  var tasks = projectOnlineProject['Tasks']
  if (tasks && tasks.length > 0) {
    var today = moment()
    _.forEach(tasks, function (task) {
      var startDate = moment(task['TaskStartDate'])
      var finishDate = moment(task['TaskFinishDate'])

      switch (task['TaskName'].toLowerCase()) {
        case 'discovery':
          projectHistory.discovery = [
            {
              label: startDate.isAfter(today) ? 'Predicted start' : 'Started',
              date: startDate.format('MMMM YYYY')
            },
            {
              label: finishDate.isAfter(today) ? 'Predicted completion' : 'Completed',
              date: finishDate.format('MMMM YYYY')
            }
          ]
          break
        case 'alpha phase':
          projectHistory.alpha = [
            {
              label: startDate.isAfter(today) ? 'Predicted start' : 'Started',
              date: startDate.format('MMMM YYYY')
            },
            {
              label: finishDate.isAfter(today) ? 'Predicted alpha completion' : 'Completed',
              date: finishDate.format('MMMM YYYY')
            }
          ]
          break
        case 'beta phase':
          projectHistory.beta = [
            {
              label: startDate.isAfter(today) ? 'Predicted start' : 'Started',
              date: startDate.format('MMMM YYYY')
            },
            {
              label: finishDate.isAfter(today) ? 'Predicted public beta release' : 'Public beta release',
              date: finishDate.format('MMMM YYYY')
            }
          ]
          break
        case 'move to live':
          projectHistory.live = [
            {
              label: finishDate.isAfter(today) ? 'Predicted live release' : 'Live release',
              date: finishDate.format('MMMM YYYY')
            }
          ]
          break
        default:
          break
      }
    })
  }

  // Remove an blank/empty records
  _removeEmptyHistory(projectHistory)
}

function _removeEmptyHistory (projectHistory) {
  if (projectHistory.discovery &&
      projectHistory.discovery.length === 1 &&
      projectHistory.discovery[0].label === '') {
    delete projectHistory.discovery
  }
  if (projectHistory.alpha &&
      projectHistory.alpha.length === 1 &&
      projectHistory.alpha[0].label === '') {
    delete projectHistory.alpha
  }
  if (projectHistory.beta &&
      projectHistory.beta.length === 1 &&
      projectHistory.beta[0].label === '') {
    delete projectHistory.beta
  }
  if (projectHistory.live &&
      projectHistory.live.length === 1 &&
      projectHistory.live[0].label === '') {
    delete projectHistory.live
  }
}

module.exports = history
