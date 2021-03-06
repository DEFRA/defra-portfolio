var express = require('express'),
    router  = express.Router(),
    _       = require('underscore');

/*
  A way to force the ordering of the themes.
*/
var theme_order = [
      'Incidents & Assets Services',
      'Permissions & Compliance Services',
      'Monitoring Services',
      'Livestock Information Services',
      'Cross Defra Services',
      'Common Architectural Services'
    ];

var priority_order = [
      // 'Top',
      'High',
      'Medium',
      'Low'
    ];

var priority_descriptions = {
      // "Top":"",
      "High":"",
      "Medium":"",
      "Low":""
    };

/*
  A way to force the ordering of the phases.
*/
var phase_order = ['backlog','discovery','alpha','beta','beta_public','live'];
/*
  A function to add the phase-key value to handle
  splitting out public beta projects.
*/
function addPhaseKey(data)
{
  return _.each(data, function(value, key, list) {
      value['phase-key'] = getPhase(value);
  });
}
/*
  A function to gather the data by
  'phase' and then 'facing' so the
  index.html can spit them out.
*/
function indexify(data)
{
  var new_data = {};
  _.each(data, function(value, key, list)
  {
    var item = _.groupBy(value,'phase-key');
    new_data[key] = {};
    _.each(item, function(v,k,l)
    {
      var piece = _.groupBy(v,'facing');
      new_data[key][k] = piece;
    });
  });
  return new_data;
}
/*
  A function to return the phase from the
  specified object.
*/
function getPhase(obj)
{
  if (obj.phase == "beta" &&
      obj.phase_modifier &&
      obj.phase_modifier == "public") {
    return obj.phase + "_" + obj.phase_modifier;
  }
  else {
    return obj.phase;
  }
}
/*
  - - - - - - - - - -  INDEX PAGE - - - - - - - - - -
*/
router.get('/', function (req, res)
{
  var data = addPhaseKey(req.app.locals.data);
  data = _.groupBy(data, 'theme');
  var new_data = indexify(data);
  var phases = _.countBy(req.app.locals.data, getPhase);
  res.render('index', {
    "data":new_data,
    "counts":phases,
    "view":"theme",
    "theme_order":theme_order,
    "phase_order":phase_order
    }
  );
});

/*
  - - - - - - - - - -  LOCATION INDEX PAGE - - - - - - - - - -
*/
router.get('/location/', function (req, res)
{
  var data = addPhaseKey(req.app.locals.data);
  data = _.groupBy(req.app.locals.data, 'location');
  var new_data = indexify(data);

  var loc_order = [];
  _.each(data, function(value, key, list)
  {
    loc_order.push(key);
  });
  loc_order.sort();

  var phases = _.countBy(req.app.locals.data, getPhase);

  res.render('index', {
    "data":new_data,
    "counts":phases,
    "view":"location",
    "theme_order":loc_order,
    "phase_order":phase_order
  });
});


/*
  - - - - - - - - - -  INDEX PAGE - - - - - - - - - -
*/
router.get('/priority/', function (req, res)
{
  var data = addPhaseKey(req.app.locals.data);
  data = _.groupBy(req.app.locals.data, 'priority');
  var new_data = indexify(data);

  var phases = _.countBy(req.app.locals.data, getPhase);

  res.render('index', {
    "data":new_data,
    "counts":phases,
    "view":"priority",
    "theme_order":priority_order,
    "phase_order":phase_order,
    "priority_descriptions":priority_descriptions
    }
  );
});

/*
  - - - - - - - - - -  PROJECT PAGE - - - - - - - - - -
*/
router.get('/projects/:id/:slug', function (req, res)
{
  var data = _.findWhere(req.app.locals.data, {id:parseInt(req.params.id)});
  res.render('project', {
    "data":data,
    "phase_order":phase_order,
  });
});

/*
  - - - - - - - - - -  PROTOTYPE REDRIECT - - - - - - - - - -
*/
router.get('/projects/:id/:slug/prototype', function (req, res)
{
  var id = req.params.id;
  var data = _.findWhere(req.app.locals.data, {id:parseInt(id)});
  if (typeof data.prototype == 'undefined')
  {
    res.render('no-prototype',{
      "data":data,
    });
  } else {
    res.redirect(data.prototype);
  }
});

/*
  - - - - - - - - - -  ALL THE DATA AS JSON - - - - - - - - - -
*/

router.get('/api', function (req, res) {
  console.log(req.app.locals.data);
  res.json(req.app.locals.data);
});

router.get('/api/:id', function (req, res) {
  var data = _.findWhere(req.app.locals.data, {id: (parseInt(req.params.id))});
  if (data) {
    res.json(data);
  } else {
    res.json({error: 'ID not found'});
  }
});

module.exports = router;
