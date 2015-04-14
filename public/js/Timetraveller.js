/**
 * TIMETRAVELLER
 */
function Timetraveller(map) {
  this.map = map
  this.id = document.getElementById('map').dataset.id
  this.markers = {}
  this.speed = 10
  this.paused = false
}

Timetraveller.prototype.init = function initTimetraveller() {
  this.initSocket()
  this.registerMapListener()
  this.registerButtons()
}

Timetraveller.prototype.initSocket = function initSocket() {
  var self = this
  this.socket = io.connect(window.location.protocol+'//'+window.location.host)

  this.socket.on('trajectory_points', function gotTrajectoryPoints(data) {
    if (self.hasMarker(data.id)) {
      return
    }

    var marker = self.createMarker(data)

    self.markers[data.id] = {
      marker: marker,
      data: data
    }
  })
}

Timetraveller.prototype.hasMarker = function hasMarker(id) {
  return this.markers.hasOwnProperty(id);
}

Timetraveller.prototype.registerMapListener = function registerMapListener() {
  var self = this

  this.map.on('zoomend', function() {
    self.update()
  })

  this.map.on('moveend', function() {
    self.update()
  })
}

Timetraveller.prototype.getBounds = function getBounds() {
  var bounds = this.map.getBounds()
  return {
    east: bounds.getEast(),
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth()
  }
}

Timetraveller.prototype.update = function update() {
  this.socket.emit('get_trajectory_points', {
    id: this.id,
    bounds: this.getBounds()
  })
}

Timetraveller.prototype.pause = function pause() {
  var markers = this.markers
  for (var id in markers) {
    markers[id].marker.pause()
  }

  this.paused = true
}

Timetraveller.prototype.play = function play() {
  var markers = this.markers
  for (var id in markers) {
    markers[id].marker.start()
  }

  this.paused = false
}

Timetraveller.prototype.setSpeed = function setSpeed(speed) {
  speed = speed || 1

  if (speed === this.speed) {
    return
  }

  this.speed = speed
  this.rerender()
}

Timetraveller.prototype.start = function start() {
  this.update()
}

Timetraveller.prototype.registerButtons = function registerButtons() {
  var self = this

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-pause'), function(el) {
    el.addEventListener('click', function() {
      self.pause()
    })
  })
}

Timetraveller.prototype.rerender = function rerender() {
  var self = this

  // delete old markers and add new ones
  var m
  for (var id in self.markers) {
    m = self.markers[id]

    // remove
    self.map.removeLayer(m.marker)

    // add
    // TODO
  }
}

Timetraveller.prototype.createMarker = function createMarker(data) {
  var self = this

  var durations = data.durations
  if (self.speed !== 1) {
    durations = durations.map(function(duration) {
      return duration / self.speed
    })
  }

  var marker = L.Marker.movingMarker(data.points, durations)
  marker.bindPopup(data.id)
  
  marker.addTo(self.map)

  marker.on('end', function() {
    self.map.removeLayer(marker)
    delete self.markers[data.id]
  })

  if (this.paused === false) {
    marker.start()
  }

  return marker
}
