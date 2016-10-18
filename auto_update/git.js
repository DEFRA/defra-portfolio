var path = require('path')
var Git = require('nodegit')
var _ = require('underscore')

var git = {}

git.commitProjectFiles = function () {
  // Add the changes to git
  // Open the repository
  var repo
  var index
  var oid
  var pathToRepo = path.resolve('../.git')
  Git.Repository.open(pathToRepo).then(function (repository) {
    repo = repository
    repository.getStatus().then(function (statuses) {
      repository.index().then(function (indexResult) {
        index = indexResult
        _.forEach(statuses, function (file) {
          index.addByPath(file.path()).then(function () {
            index.write().then(function () {
              index.writeTree().then(function (oidResult) {
                oid = oidResult

                // Commit the files
              })
            })
          })
        })
      })
    })
  })
}

git.commitProjectFiles()

module.exports = git
