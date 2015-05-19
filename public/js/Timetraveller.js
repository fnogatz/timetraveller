/**
 * TIMETRAVELLER
 */
function Timetraveller(map) {
  this.map = map
  this.id = document.getElementById('map').dataset.id
  this.slug = document.getElementById('map').dataset.slug
  this.markers = {}
  this._speed = 1
  this.paused = false
  this._timestamp = Date.now()
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
    bounds: this.getBounds(),
    timestamp: this._timestamp,
    speed: this._speed
  })
}

Timetraveller.prototype.pause = function pause() {
  var markers = this.markers
  for (var id in markers) {
    markers[id].marker.pause()
  }

  this.paused = true
}

Timetraveller.prototype.resume = function resume() {
  var markers = this.markers
  for (var id in markers) {
    markers[id].marker.resume()
  }

  this.paused = false
}

Timetraveller.prototype.setSpeed = function setSpeed(speed) {
  speed = speed || 1

  if (speed === this._speed) {
    return
  }

  for (var id in this.markers) {
    this.markers[id].marker.setSpeed(speed)
  }

  this._speed = speed
}

Timetraveller.prototype.setDate = function setDate(date) {
  if (date instanceof Date) {
    this._timestamp = date.getTime()
  }
  else if (typeof date === 'number') {
    this._timestamp = date
  }

  this.clear()
  this.update()
}

Timetraveller.prototype.start = function start() {
  this.update()
}

Timetraveller.prototype.clear = function clear() {
  var self = this

  for (var id in self.markers) {
    self.map.removeLayer(self.markers[id].marker)
    delete self.markers[id]
  }
}

Timetraveller.prototype.registerButtons = function registerButtons() {
  var self = this

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-pause'), function(el) {
    el.addEventListener('click', function() {
      self.pause()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-play'), function(el) {
    el.addEventListener('click', function() {
      self.resume()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-date'), function(el) {
    //el.textContent = 
  })
}

Timetraveller.prototype.createMarker = function createMarker(data) {
  var self = this

  var marker = L.Marker.movingMarker(data.points, data.durations, {
    speed: self._speed
  })

  var popupText = this.getPopupText(data)

  marker.bindPopup(popupText)
  
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

Timetraveller.prototype.getPopupText = function getPopupText(data) {
  if (this.slug.match(/Ulm/)) {
    var text = '<b>Linie '+data.entities.route.shortName+'</b>'
    if (data.entities.route.longName) {
      text += '<br>'+data.entities.route.longName
    }
    return text
  }
  else if (this.slug === 'Peking') {
    return 'Taxi '+data.id
  }
  return data.id
}
