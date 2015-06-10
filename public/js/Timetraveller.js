L.HtmlIcon = L.Icon.extend({
  options: {
    /*
    html: (String) (required)
    iconAnchor: (Point)
    popupAnchor: (Point)
    */
  },

  initialize: function (options) {
    L.Util.setOptions(this, options)
  },

  createIcon: function () {
    var div = document.createElement('div')
    div.innerHTML = this.options.html
    return div
  },

  createShadow: function () {
    return null
  }
})

/**
 * TIMETRAVELLER
 */
function Timetraveller (map) {
  var self = this

  this.map = map
  this.id = document.getElementById('map').dataset.id
  this.slug = document.getElementById('map').dataset.slug
  this.markers = {}
  this._speed = 1
  this.paused = false
  this._timestamp = Date.now()
  this._elements = {
    clock: [],
    speed: []
  }
  this._clock = null
  this._slice = true
}

Timetraveller.speedLevels = [
  0.1,
  0.2,
  0.5,
  1,
  2,
  5,
  10,
  20,
  60,
  100
]

Timetraveller.updateSpeed = 1000

Timetraveller.prototype.init = function initTimetraveller () {
  this.initSocket()
  this.registerMapListener()
  this.registerButtons()
  this._setClock()
  this._setUpdateTimer()
}

Timetraveller.prototype._setClock = function _setClock () {
  var self = this

  if (this._clock) {
    clearTimeout(this._clock)
  }
  var duration = Timetraveller.updateSpeed / this._speed

  function setTimer () {
    self._clock = setTimeout(function () {
      self._timestamp += Timetraveller.updateSpeed
      self.tick()

      setTimer()
    }, duration)
  }

  setTimer()
}

Timetraveller.prototype._setUpdateTimer = function _setUpdateTimer () {
  var self = this

  function setTimer () {
    setTimeout(function () {
      self.update()

      setTimer()
    }, 20000)
  }

  setTimer()
}

Timetraveller.prototype.initSocket = function initSocket () {
  var self = this
  this.socket = io.connect(window.location.protocol + '//' + window.location.host)

  this.socket.on('trajectory_points', function gotTrajectoryPoints (data) {
    if (self.hasMarker(data.id)) {
      return
    }

    var points = []
    var durations = []
    data.points.forEach(function (point, ix) {
      if (self._slice && point.time < self._timestamp) {
        // use only future points
        return
      }

      points.push([
        point.coordinates[1],
        point.coordinates[0]
      ])
      if (ix > 0) {
        diff = point.time - data.points[ix - 1].time
        durations.push(diff)
      }
    })

    var markerData = {
      entities: data.entities,
      id: data.id,
      points: points,
      durations: durations
    }

    var marker = self.createMarker(markerData)

    self.markers[markerData.id] = {
      marker: marker,
      data: markerData
    }
  })
}

Timetraveller.prototype.nextSpeed = function nextSpeed () {
  var self = this
  var currentSpeed = self._speed
  var levels = Timetraveller.speedLevels

  var i
  for (i = 0; i < levels.length; i++) {
    if (levels[i] > currentSpeed) {
      break
    }
  }
  i = Math.min(i, levels.length - 1)
  return levels[i]
}

Timetraveller.prototype.previousSpeed = function previousSpeed () {
  var self = this
  var currentSpeed = self._speed
  var levels = Timetraveller.speedLevels

  var i
  for (i = levels.length; i >= 0; i--) {
    if (levels[i] < currentSpeed) {
      break
    }
  }
  i = Math.max(i, 0)
  return levels[i]
}

Timetraveller.prototype.nextLevel = function nextLevel () {
  var self = this

  self.setSpeed(self.nextSpeed())
}

Timetraveller.prototype.previousLevel = function previousLevel () {
  var self = this

  self.setSpeed(self.previousSpeed())
}

Timetraveller.prototype.hasMarker = function hasMarker (id) {
  return this.markers.hasOwnProperty(id)
}

Timetraveller.prototype.registerMapListener = function registerMapListener () {
  var self = this

  this.map.on('zoomend', function () {
    self.update()
  })

  this.map.on('moveend', function () {
    self.update()
  })
}

Timetraveller.prototype.getBounds = function getBounds () {
  var bounds = this.map.getBounds()
  return {
    east: bounds.getEast(),
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth()
  }
}

Timetraveller.prototype.preloadTime = function preloadTime () {
  var self = this
  var preloadTime = 1000 * 30 * self._speed // 30 seconds display time
  return preloadTime
}

Timetraveller.prototype.update = function update () {
  var self = this

  var preloadTime = self.preloadTime()

  self.socket.emit('get_trajectory_points', {
    id: this.id,
    bounds: self.getBounds(),
    from: self._timestamp,
    to: self._timestamp + preloadTime,
    speed: self._speed
  })
}

Timetraveller.prototype.pause = function pause () {
  var markers = this.markers
  for (var id in markers) {
    markers[id].marker.pause()
  }

  this.paused = true
  clearTimeout(this._clock)
}

Timetraveller.prototype.resume = function resume () {
  var markers = this.markers
  for (var id in markers) {
    markers[id].marker.resume()
  }

  this.paused = false
  this._setClock()
}

Timetraveller.prototype.setSpeed = function setSpeed (speed) {
  var self = this

  speed = speed || 1

  if (speed === this._speed) {
    return
  }

  for (var id in this.markers) {
    this.markers[id].marker.setSpeed(speed)
  }

  this._speed = speed
  this._setClock()

  this._elements.speed.forEach(function (el) {
    el.innerHTML = 'Speed: ' + speed + 'x'
  })

  self.update()
}

Timetraveller.prototype.setDate = function setDate (date) {
  if (date instanceof Date) {
    this._timestamp = date.getTime()
  }
  else if (typeof date === 'number') {
    this._timestamp = date
  }

  this.clear()
  this.update()
}

Timetraveller.prototype.start = function start () {
  this.update()
}

Timetraveller.prototype.clear = function clear () {
  var self = this

  for (var id in self.markers) {
    self.map.removeLayer(self.markers[id].marker)
    delete self.markers[id]
  }
}

Timetraveller.prototype.registerButtons = function registerButtons () {
  var self = this

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-pause'), function (el) {
    el.addEventListener('click', function () {
      self.pause()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-play'), function (el) {
    el.addEventListener('click', function () {
      self.resume()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-slower'), function (el) {
    el.addEventListener('click', function () {
      self.previousLevel()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-faster'), function (el) {
    el.addEventListener('click', function () {
      self.nextLevel()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-clock'), function (el) {
    self._elements.clock.push(el)
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-speed'), function (el) {
    self._elements.speed.push(el)
  })
}

Timetraveller.prototype.tick = function tick () {
  var self = this

  self._elements.clock.forEach(function (el) {
    el.innerHTML = (new Date(self._timestamp)).toString().replace(/ GMT.+$/, '')
  // el.innerHTML = self._timestamp
  })
}

Timetraveller.prototype.createMarker = function createMarker (data) {
  var self = this

  if (data.entities.route) {
    var css = ''
    if (data.entities.route.color) {
      css += 'background:#' + data.entities.route.color + ';'
    } else {
      css += 'background:green;'
    }

    var icon = new L.HtmlIcon({
      html: '<div class="icon" style="' + css + '">' + data.entities.route.shortName + '</div>',
    })

    var marker = L.Marker.movingMarker(data.points, data.durations, {
      speed: self._speed,
      icon: icon
    })
  } else {
    var marker = L.Marker.movingMarker(data.points, data.durations, {
      speed: self._speed
    })
  }

  var popupText = this.getPopupText(data)

  marker.bindPopup(popupText)

  marker.addTo(self.map)

  marker.on('end', function () {
    self.map.removeLayer(marker)
    delete self.markers[data.id]
  })

  if (this.paused === false) {
    marker.start()
  }

  return marker
}

Timetraveller.prototype.getPopupText = function getPopupText (data) {
  if (this.slug.match(/Ulm/)) {
    var text = '<b>Linie ' + data.entities.route.shortName + '</b>'
    if (data.entities.route.longName) {
      text += '<br>' + data.entities.route.longName
    }
    return text
  }
  else if (this.slug === 'Peking') {
    return 'Taxi ' + data.id
  }
  return data.id
}
