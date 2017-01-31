var express = require('express')
var router = express.Router()
var _ = require('underscore')
var path = require('path')
var load = require(path.join(__dirname, '../auto_update/load.js'))

/*
  A way to force the ordering of the phases.
*/
var phaseOrder = [
  'backlog',
  'discovery',
  'alpha',
  'beta',
  'beta_public',
  'live'
]

/*
  A function to add the phase-key value to handle
  splitting out public beta projects.
*/
function addPhaseKey (data) {
  return _.each(data, function (value, key, list) {
    value['phase-key'] = getPhase(value)
  })
}

/*
  A function to gather the data by
  'phase' and then 'facing' so the
  index.html can spit them out.
*/
function indexify (data) {
  var newData = {}
  _.each(data, function (value, key, list) {
    var item = _.groupBy(value, 'phase-key')
    newData[key] = {}
    _.each(item, function (v, k, l) {
      newData[key][k] = v
    })
  })
  return newData
}

/*
  A function to return the phase from the
  specified object.
*/
function getPhase (obj) {
  if (obj.phase === 'beta' &&
      obj.phase_modifier &&
      obj.phase_modifier === 'public') {
    return obj.phase + '_' + obj.phase_modifier
  } else {
    return obj.phase
  }
}

/*
  - - - - - - - - - -  INDEX PAGE - - - - - - - - - -
*/
router.get('/', function (req, res) {
  load.getProjects()
    .then(data => {
      data = addPhaseKey(data)
      data = _.groupBy(data, 'programme')
      var programmes = _.keys(data).sort()
      var newData = indexify(data)
      var phases = _.countBy(data, getPhase)

      load.getLastUpdateTime()
        .then(lastUpdateTime => {
          res.render('index', {
            data: newData,
            counts: phases,
            view: 'programme',
            project_order: programmes,
            phase_order: phaseOrder,
            last_update_time: lastUpdateTime
          })
        })
    })
    .catch(err => {
      throw err
    })
})

/*
  - - - - - - - - - - STATUS INDEX PAGE - - - - - - - - - -
*/
router.get('/status/', function (req, res) {
  load.getProjects()
    .then(data => {
      data = addPhaseKey(data)
      data = _.groupBy(data, 'status')
      var statuses = _.keys(data).sort()
      var newData = indexify(data)
      var phases = _.countBy(data, getPhase)

      load.getLastUpdateTime()
        .then(lastUpdateTime => {
          res.render('index', {
            data: newData,
            counts: phases,
            view: 'status',
            project_order: statuses,
            phase_order: phaseOrder,
            last_update_time: lastUpdateTime
          })
        })
    })
    .catch(err => {
      throw err
    })
})

/*
  - - - - - - - - - -  PROJECT PAGE - - - - - - - - - -
*/
router.get('/projects/:id/:slug', function (req, res) {
  load.getProjects()
    .then(data => {
      data = _.findWhere(data, { id: parseInt(req.params.id) })
      res.render('project', {
        data: data,
        phase_order: phaseOrder
      })
    })
    .catch(err => {
      throw err
    })
})

/*
  - - - - - - - - - -  PROTOTYPE REDRIECT - - - - - - - - - -
*/
router.get('/projects/:id/:slug/prototype', function (req, res) {
  var id = req.params.id
  load.getProjects()
    .then(data => {
      data = _.findWhere(data, {id: parseInt(id)})
      if (typeof data.prototype === 'undefined') {
        res.render('no-prototype', {
          data: data
        })
      } else {
        res.redirect(data.prototype)
      }
    })
    .catch(err => {
      throw err
    })
})

/*
  - - - - - - - - - -  ALL THE DATA AS JSON - - - - - - - - - -
*/

router.get('/api', function (req, res) {
  load.getProjects()
    .then(data => {
      console.log(data)
      res.json(data)
    })
    .catch(err => {
      throw err
    })
})

router.get('/api/:id', function (req, res) {
  load.getProjects()
    .then(data => {
      data = _.findWhere(data, {id: (parseInt(req.params.id))})
      if (data) {
        res.json(data)
      } else {
        res.json({error: 'ID not found'})
      }
    })
    .catch(err => {
      throw err
    })
})

module.exports = router
