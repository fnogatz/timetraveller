var express = require('express')
var router = express.Router()

var maps = require('./maps')

router.get('/:id/map.js', function (req, res, next) {
  if (!maps.hasOwnProperty(req.params.id)) {
    return next()
  }

  var m = maps[req.params.id]

  var data = {
    map: {
      tiles: defaultTiles(),
      zoom: m.map.zoom || 16,
      center: m.map.center
    }
  }
  if (m.map.hasOwnProperty('date')) {
    data.startTime = m.map.date
  } else {
    data.startTime = null
  }

  res.render('map.js.ejs', data)
})

router.get('/:id', function (req, res, next) {
  if (!maps.hasOwnProperty(req.params.id)) {
    return next()
  }

  var m = maps[req.params.id]

  var map = {
    id: req.params.id,
    data: m.map
  }

  var startTime = new Date()
  if (m.map.hasOwnProperty('date')) {
    startTime = new Date(m.map.date)
  }

  res.render('map', {
    date: (startTime).toString().replace(/ GMT.+$/, ''),
    map: map,
    maps: maps._list
  })
})

module.exports = router

function defaultTiles () {
  return {
    'transitmap': {
      'name': 'Transit Map',
      'url': 'http://a.tile2.opencyclemap.org/transport/{z}/{x}/{y}.png',
      'attribution': [
        'Kartendaten &copy; <a href="http://openstreetmap.org/">OpenStreetMap</a>-Beitragende',
        'OSM Transit Map'
      ]
    },
    'hikebike': {
      'name': 'Hike and Bike Map',
      'url': 'http://toolserver.org/tiles/hikebike/{z}/{x}/{y}.png',
      'attribution': [
        'Kartendaten &copy; <a href="http://openstreetmap.org/">OpenStreetMap</a>-Beitragende',
        '<a href="http://hikebikemap.de/">Hikebikemap.de</a>'
      ]
    }
  }
}
