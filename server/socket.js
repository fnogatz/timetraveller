module.exports = onConnection

var maps = require('./maps')

function onConnection (socket) {
  socket.on('get_trajectory_points', function (data) {
    var slice = true
    data.speed = data.speed || 1

    var query = {
      bounds: data.bounds,
      time: {
        start: new Date(data.from),
        end: new Date(data.to)
      }
    }

    var model = maps[data.id]._connector

    // find trajectories
console.log('SEND QUERY')
    model.findTrajectories(query, function (trajectory) {
      console.log('TRAJ FOUND')

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

  socket.on('error', function(err) {
    console.error(err)
  })
}
