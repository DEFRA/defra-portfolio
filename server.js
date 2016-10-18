var path = require('path')
var express = require('express')
var browserSync = require('browser-sync')
var nunjucks = require('express-nunjucks')
var load = require(path.join(__dirname, '/auto_update/load.js'))
require(path.join(__dirname, '/auto_update/cron.js'))
var routes = require(path.join(__dirname, '/app/routes.js'))
var disRoutes = require(path.join(__dirname, '/app/views/display/routes.js'))
var favicon = require('serve-favicon')
var app = express()
var port = process.env.PORT || 3100
var env = process.env.NODE_ENV || 'development'

// Get the projects
app.locals.data = load.getProjects()

// Application settings
app.set('view engine', 'html')
app.set('views', [path.join(__dirname, '/app/views/'), path.join(__dirname, '/lib/')])

// Middleware to serve static assets
app.use('/public', express.static(path.join(__dirname, '/public')))
app.use('/public', express.static(path.join(__dirname, '/govuk_modules/govuk_template/assets')))
app.use('/public', express.static(path.join(__dirname, '/govuk_modules/govuk_frontend_toolkit')))
app.use('/public/images/icons', express.static(path.join(__dirname, '/govuk_modules/govuk_frontend_toolkit/images')))

nunjucks.setup({
  autoescape: true,
  watch: true
}, app, function (env) {
  env.addFilter('slugify', function (str) {
    return str.replace(/[.,-\/#!$%\^&\*;:{}=\-_`~()’]/g, '').replace(/ +/g, '_').toLowerCase()
  })
})

// Elements refers to icon folder instead of images folder
app.use(favicon(path.join(__dirname, 'govuk_modules', 'govuk_template', 'assets', 'images', 'favicon.ico')))

// send assetPath to all views
app.use(function (req, res, next) {
  res.locals.asset_path = '/public/'
  next()
})

// routes (found in app/routes.js)
if (typeof (routes) !== 'function') {
  console.log(routes.bind)
  console.log('Warning: the use of bind in routes is deprecated - please check the prototype kit documentation for writing routes.')
  routes.bind(app)
} else {
  app.use('/', disRoutes)
  app.use('/', routes)
}

// auto render any view that exists
app.get(/^\/([^.]+)$/, function (req, res) {
  var path = (req.params[0])

  // remove the trailing slash because it seems nunjucks doesn't expect it.
  if (path.substr(-1) === '/') path = path.substr(0, path.length - 1)

  res.render(path, req.data, function (err, html) {
    if (err) {
      res.render(path + '/index', req.data, function (err2, html) {
        if (err2) {
          res.status(404).send(path + '<br />' + err + '<br />' + err2)
        } else {
          res.end(html)
        }
      })
    } else {
      res.end(html)
    }
  })
})

// start the app
if (env === 'production') {
  app.listen(port)
} else {
  // for development use browserSync as well
  app.listen(port, function () {
    browserSync({
      proxy: 'localhost:' + port,
      files: [
        'public/**/*.{js,css}',
        'app/views/**/*.html'
      ],
      ghostmode: {
        clicks: true,
        forms: true,
        scroll: true
      },
      open: false,
      port: (port + 1)
    })
  })
}

console.log('')
console.log('Listening on port ' + port)
console.log('')
