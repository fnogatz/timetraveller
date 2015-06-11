var req = require('require-yml')
var express = require('express')
var router = express.Router()

var maps = require('./maps')

router.get('/:id', function (req, res, next) {
  if (!maps.hasOwnProperty(req.params.id)) {
    return next()
  }

  var map = {
    id: req.params.id,
    tiles: defaultTiles(),
    data: maps[req.params.id].map
  }

  res.render('map', {
    map: map,
    maps: maps._list,
  })
})

module.exports = router

function defaultTiles() {
  return {
    "transitmap": {
      "name": "Transit Map",
      "url": "http://a.tile2.opencyclemap.org/transport/{z}/{x}/{y}.png",
      "attribution": [
        "Kartendaten &copy; <a href=\"http://openstreetmap.org/\">OpenStreetMap</a>-Beitragende",
        "OSM Transit Map"
      ]
    },
    "hikebike": {
      "name": "Hike and Bike Map",
      "url": "http://toolserver.org/tiles/hikebike/{z}/{x}/{y}.png",
      "attribution": [
        "Kartendaten &copy; <a href=\"http://openstreetmap.org/\">OpenStreetMap</a>-Beitragende",
        "<a href=\"http://hikebikemap.de/\">Hikebikemap.de</a>"
      ]
    }
  }
}