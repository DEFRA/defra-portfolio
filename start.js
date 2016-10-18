var path = require('path')
var gruntfile = path.join(__dirname, '/Gruntfile.js')
require(path.join(__dirname, '/node_modules/grunt/lib/grunt.js')).cli({
  'gruntfile': gruntfile
})

process.on('SIGINT', function () {
  process.kill(process.pid, 'SIGTERM')
  process.exit()
})
