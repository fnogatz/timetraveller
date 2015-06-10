module.exports = onConnection

var Model = require('../lib/model')
var model = Model.getInstance()
model.connect()

function onConnection (socket) {
  socket.on('get_trajectory_points', function (data) {
    var slice = true
    data.speed = data.speed || 1

    // find trajectories
    model.getMap(data.id, function (err, map) {
      var query = {
        bounds: data.bounds,
        time: {
          start: new Date(data.from),
          end: new Date(data.to)
        }
      }

      map.findTrajectories(query, function (err, trajectory) {
        if (err) {
          console.error('Fehler', err)
          return
        }

        var points = []

        trajectory.points.forEach(function (point, ix) {
          if (slice && point.time < query.time.start) {
            // return only future points
            return
          }

          points.push({
            coordinates: point.coordinates,
            time: point.time.getTime()
          })
        })

        socket.emit('trajectory_points', {
          id: trajectory.id,
          points: points,
          entities: trajectory.entities
        })
      })
    })
  })

  socket.emit('news', { hello: 'world' })
}
