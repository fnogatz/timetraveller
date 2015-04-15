var express = require('express')
var router = express.Router()

var Model = require('../lib/model')

var config = {
  maptiles: require('../config/maptiles.json')
}

var model = Model.getInstance()
model.connect()

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' })
})

router.get('/new', function (req, res, next) {
  var tiles = config.maptiles

  res.render('edit', {
    baseUri: req.protocol + '://' + req.get('host') + '/m/',
    tiles: tiles,
    errors: formErrors(req.flash('errors')),
    populate: req.flash('populate')
  })
})

router.post('/new', function (req, res, next) {
  req.checkBody('name', 'The name must be at least 3 characters').isLength(3)
  req.checkBody('slug', 'The slug can contain only letters and numbers').isAlphanumeric()
  req.checkBody('slug', 'The slug must be at least 3 characters').isLength(3)

  var errors = req.validationErrors()
  if (errors) {
    req.flash('errors', errors)
    req.flash('populate', req.body)
    res.redirect('/new')
    return
  }

  res.render('index', { title: 'Kein Fehler' })
})

router.get('/m/:slug', function (req, res, next) {
  model.getMapBySlug(req.params.slug, function(err, map) {
    if (err) {
      // TODO
      return
    }

    var maps = [
      {
        name: 'Nahverkehr in Ulm',
        slug: 'Ulm'
      },
      {
        name: 'Taxi in Peking',
        slug: 'Peking'
      }
    ]
    maps.forEach(function(map) {
      if (map.slug === req.params.slug) {
        map.active = true;
      }
    })

    res.render('map', {
      map: map,
      maps: maps
    })
  })
})

/**
 * Take an error object created by express-validator and
 *   create a better-to-use object.
 * @param  {Array} arr  Return of express-validator
 * @return {Object}
 */
function formErrors(arr) {
  var res = {}
  arr.forEach(function(err) {
    if (!res.hasOwnProperty(err.param)) {
      res[err.param] = []
    }
    res[err.param].push(err)
  })
  return res
}


/*
router.get('/map/:dataset', function (req, res, next) {
  res.render('map', {
    title: 'Map'
  })
})




router.get('/:database', function (req, res, next) {
  res.render('map', {
    title: 'Map'
  })
})

*/


module.exports = router
