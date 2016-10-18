var phase = {}

phase.translate = function (portfolioProject, projectOnlineProject) {
  var phase = projectOnlineProject['LifecycleStage']
  if (phase) {
    switch (phase) {
      case 'Demand.Pipeline':
        portfolioProject.phase = 'backlog'
        portfolioProject.phase_modifier = ''
        break
      case 'Delivery.Discovery':
      case 'Delivery.StartUp':
      case 'Delivery.Initiation':
        portfolioProject.phase = 'discovery'
        portfolioProject.phase_modifier = ''
        break
      case 'Delivery.Alpha':
      case 'Delivery.Design':
        portfolioProject.phase = 'alpha'
        portfolioProject.phase_modifier = ''
        break
      case 'Delivery.Beta':
        portfolioProject.phase = 'beta'
        portfolioProject.phase_modifier = ''
        break
      case 'Delivery.Live':
        portfolioProject.phase = 'live'
        portfolioProject.phase_modifier = ''
        break
      default:
        break
    }
  }
}

module.exports = phase
