/**
 * LEAFLET MAP
 */
L.Icon.Default.imagePath = '/img/vendor/leaflet' // TODO

var tileLayers = {}
var tiles = TimetravellerOptions.map.tiles
for (var key in tiles) {
  tileLayers[tiles[key].name] = new L.TileLayer(
    tiles[key].url, {
      attribution: tiles[key].attribution.join(', ')
    }
  )
}
var map = L.map('map', {
  minZoom: TimetravellerOptions.map.minZoom || 14
})

map.setView(TimetravellerOptions.map.center, TimetravellerOptions.map.zoom)

// Add default tile layer
tileLayers[Object.keys(tileLayers)[0]].addTo(map)

// Add tile layer control
L.control.layers(tileLayers).addTo(map)

// Initialize Timetraveller
var timetraveller = new Timetraveller(map, document.getElementById('timeline'), TimetravellerOptions)
timetraveller.init()
timetraveller.start()
