/**
 * LEAFLET MAP
 */
L.Icon.Default.imagePath = '/img/vendor/leaflet' // TODO

var tileLayers = {}
for (var key in tiles) {
  tileLayers[tiles[key].name] = new L.TileLayer(
    tiles[key].url, {
      attribution: tiles[key].attribution.join(', ')
    }
  )
}
var map = L.map('map')

// TODO
// Use Ulm
if (window.location.pathname === '/m/Ulm') {
  map.setView([48.400833333333, 9.9872222222222], 16)
}
else if (window.location.pathname === '/m/Peking') {
  map.setView([39.92889, 116.38833], 16)
}

// Add default tile layer
tileLayers[Object.keys(tileLayers)[0]].addTo(map)

// Add tile layer control
L.control.layers(tileLayers).addTo(map)

// Initialize Timetraveller
var timetraveller = new Timetraveller(map)
timetraveller.init()
timetraveller.start()
