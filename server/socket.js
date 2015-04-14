module.exports = onConnection

var Model = require('../lib/model')
var model = Model.getInstance()
model.connect()

function onConnection (socket) {
  socket.on('get_trajectory_points', function(data) {
    var id = data.id
    var bounds = data.bounds
    var slice = true

    // find trajectories
    model.getMap(id, function(err, map) {
      var query = {
        bounds: bounds,
        time: {
          start: new Date(),
          end: new Date() + 30*60*1000
        }
      }

      map.findTrajectories(query, function(err, trajectories) {
        if (err) {
          console.log('Fehler', err)
          return //TODO
        }

        var traj
        var points
        var durations
        var diff
        for (var key in trajectories) {
          traj = trajectories[key]
          points = []
          durations = []

          traj.points.forEach(function(point, ix) {
            if (slice && point.time < query.time.start) {
              // return only future points
              return
            }

            points.push([
              point.coordinates[1],
              point.coordinates[0]
            ])
            if (ix > 0) {
              diff = point.time - traj.points[ix-1].time
              durations.push(diff)
            }
          })

          socket.emit('trajectory_points', {
            id: traj.id,
            points: points,
            durations: durations
          })
        }
      })
    })
  });

  socket.emit('news', { hello: 'world' });
}