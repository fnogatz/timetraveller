/**
 * TIMETRAVELLER
 */
function Timetraveller (map, timeline, options) {
  var self = this

  this.map = map
  this.id = document.getElementById('map').dataset.id
  this.slug = document.getElementById('map').dataset.slug
  this.markers = {}
  this._elements = {
    clock: [],
    speed: [],
    play: [],
    stop: []
  }
  this._options = options || {}

  this._timeline = timeline
}

Timetraveller.speedLevels = [
  0.25,
  0.5,
  1,
  2,
  5,
  10,
  30,
  60
]

Timetraveller.tickLen = 250

Timetraveller.prototype.init = function initTimetraveller () {
  this.initSocket()
  this.registerMapListener()
  this.registerButtons()
  this._setPlayback()
  this._setTimeline()
  this._setUpdateTimer()
}

Timetraveller.prototype._setPlayback = function _setPlayback () {
  var self = this
  var playback

  var playbackOptions = {
    playControl: false,
    dateControl: false,
    sliderControl: false,
    tracksLayer: false,
    tickLen: Timetraveller.tickLen,
    marker: self.createMarker.bind(self),
    hideInactive: true
  }

  var time = new Date().getTime()
  if (self._options.hasOwnProperty('startTime')) {
    time = new Date(self._options.startTime).getTime()
  }

  playback = new L.Playback(this.map, null, onPlaybackTimeChange, playbackOptions)
  playback.setSpeed(1)
  playback.setCursor(time)
  this.resetClockText(time)
  this.resetTimelineRange()

  playback.addCallback(self.resetClockText.bind(self))

  this.playback = playback

  function onPlaybackTimeChange (ms) {
    if (self.timeline) {
      self.timeline.moveTo(ms, { animate: false })
    }
  }
}

Timetraveller.prototype._setTimeline = function _setTimeline () {
  var self = this

  if (!self._timeline) {
    return
  }

  var timelineOptions = {
    width: '100%',
    height: '50px',
    style: 'box',
    axisOnTop: false,
    showCustomTime: false,
    showCurrentTime: false,
    orientation: 'top',
    zoomable: false
  }

  // Setup timeline
  var timeline = new vis.Timeline(self._timeline, null, timelineOptions)

  timeline.on('rangechange', function (range) {
    if (range.byUser) {
      var center = (range.end.getTime() - range.start.getTime()) / 2 + range.start.getTime()

      self.playback.setCursor(center)
    }
  })

  timeline.on('rangechanged', function (props) {
    if (props.byUser) {
      self.update()
    }
  })

  self.timeline = timeline

  self.resetTimelineRange()
}

Timetraveller.prototype.resetTimelineRange = function resetTimelineRange () {
  var self = this

  if (!self.timeline) {
    return
  }

  var preloadTime = self.preloadTime()
  var currentTime = self.playback.getTime()
  self.timeline.setWindow(
    currentTime - preloadTime,
    currentTime + preloadTime
  )
}

Timetraveller.prototype.resetClockText = function resetClockText (ms) {
  var self = this

  ms = ms || self.playback.getTime()

  self._elements.clock.forEach(function (el) {
    el.innerHTML = (new Date(ms)).toString().replace(/ GMT.+$/, '')
  })
}

Timetraveller.prototype._setUpdateTimer = function _setUpdateTimer () {
  var self = this

  if (self._updateTimer) {
    return
  }

  var preloadTime = self.preloadTime()

  self._updateTimer = setInterval(function () {
    console.log('Trigger update by timer')

    self.update()
  }, preloadTime)
}

Timetraveller.prototype._clearUpdateTimer = function _clearUpdateTimer () {
  var self = this

  clearInterval(self._updateTimer)
  self._updateTimer = null
}

Timetraveller.prototype.initSocket = function initSocket () {
  var self = this
  this.socket = io.connect(window.location.protocol + '//' + window.location.host)

  this.socket.on('trajectory', function (trajectory) {
    if (self.hasMarker(trajectory._id)) {
      return
    }

    self.markers[trajectory._id] = true

    trajectory.geometry.type = 'MultiPoint'
    self.playback.addData(trajectory)

    if (!self.playback.isPlaying()) {
      // To move the vehicle to the current position
      self.playback.setCursor(self.playback.getTime())
      self.resetTimelineRange()
    }

    console.log('Added Traj:', trajectory._id)
  })
}

Timetraveller.prototype.nextSpeed = function nextSpeed () {
  var self = this
  var currentSpeed = self.playback.getSpeed()
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
  var currentSpeed = self.playback.getSpeed()
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

Timetraveller.prototype.nextSpeedLevel = function nextSpeedLevel () {
  var self = this

  self.setSpeed(self.nextSpeed())
}

Timetraveller.prototype.previousSpeedLevel = function previousSpeedLevel () {
  var self = this

  self.setSpeed(self.previousSpeed())
}

Timetraveller.prototype.hasMarker = function hasMarker (id) {
  return this.markers.hasOwnProperty(id)
}

Timetraveller.prototype.registerMapListener = function registerMapListener () {
  var self = this

  self.map.on('zoomend', function () {
    self.update()
  })

  self.map.on('moveend', function () {
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
  var preloadTime = 1000 * 30 * self.playback.getSpeed()
  return preloadTime
}

Timetraveller.prototype.update = function update () {
  var self = this

  self._clearUpdateTimer()

  var preloadTime = self.preloadTime()

  console.log('Request trajectories')
  self.socket.emit('get_trajectory_points', {
    id: this.id,
    bounds: self.getBounds(),
    from: self.playback.getTime() - preloadTime,
    to: self.playback.getTime() + preloadTime,
    speed: self.playback.getSpeed()
  })

  if (self.playback.isPlaying()) {
    self._setUpdateTimer()
  }
}

Timetraveller.prototype.stop = function stop () {
  var self = this

  self.playback.stop()

  if (self._updateTimer) {
    self._clearUpdateTimer()
  }

  self._elements.stop.forEach(function (el) {
    el.className = el.className + ' active'
  })
  self._elements.play.forEach(function (el) {
    el.className = el.className.replace(/\bactive\b/g, '')
  })
}

Timetraveller.prototype.play = function play () {
  var self = this

  self.playback.start()

  self._elements.play.forEach(function (el) {
    el.className = el.className + ' active'
  })
  self._elements.stop.forEach(function (el) {
    el.className = el.className.replace(/\bactive\b/g, '')
  })

  self._setUpdateTimer()
}

Timetraveller.prototype.setSpeed = function setSpeed (speed) {
  var self = this

  speed = speed || 1

  if (speed === self.playback.getSpeed()) {
    return
  }

  self.playback.setSpeed(speed)
  self.playback._tickLen = Math.max(Math.round(Timetraveller.tickLen * speed), Timetraveller.tickLen)

  self.resetTimelineRange()

  self.update()

  this._elements.speed.forEach(function (el) {
    el.innerHTML = 'Speed: ' + speed + 'x'
  })
}

Timetraveller.prototype.setDate = function setDate (date) {
  var self = this

  var ms
  if (date instanceof Date) {
    ms = date.getTime()
  }
  else if (typeof date === 'number') {
    ms = date
  }

  self.playback.setCursor(ms)
  self.update()
}

Timetraveller.prototype.start = function start () {
  this.update()

// this.play()
}

Timetraveller.prototype.registerButtons = function registerButtons () {
  var self = this

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-stop'), function (el) {
    el.addEventListener('click', function () {
      self.stop()
    })
    self._elements.stop.push(el)
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-play'), function (el) {
    el.addEventListener('click', function () {
      self.play()
    })
    self._elements.play.push(el)
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-slower'), function (el) {
    el.addEventListener('click', function () {
      self.previousSpeedLevel()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-faster'), function (el) {
    el.addEventListener('click', function () {
      self.nextSpeedLevel()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-clock'), function (el) {
    self._elements.clock.push(el)
  })

  Array.prototype.forEach.call(document.querySelectorAll('.timetraveller-speed'), function (el) {
    self._elements.speed.push(el)
  })
}

Timetraveller.prototype.createMarker = function createMarker (data) {
  var self = this
  var marker = {}

  if (data.properties.trip && data.properties.trip.route) {
    var route = data.properties.trip.route

    var css = ''
    if (route.color) {
      css += 'background-color:#' + route.color + ';'
    } else {
      css += 'background-color:green;'
    }

    marker.icon = new L.HtmlIcon({
      html: '<div class="icon" style="' + css + '">' + route.shortName + '</div>',
    })

    marker.getPopup = function (pos) {
      return route.longName
    }
  } else {
    marker.icon = new L.HtmlIcon({
      html: '<div class="icon" style="background-color:#4078C0"></div>'
    })
  }

  return marker
}
