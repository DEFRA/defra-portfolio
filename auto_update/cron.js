var CronJob = require('cron').CronJob
var path = require('path')
var load = require(path.join(__dirname, '/load.js'))

// Sets up the cron job to update the project files from
// Project Online every Friday night at 9pm
var job = new CronJob({
  //cronTime: '00 00 21 * * 5',
  cronTime: '0 */1 * * * *',
  onTick: function () {
    load.updateProjects()
  },
  start: false
})
job.start()
