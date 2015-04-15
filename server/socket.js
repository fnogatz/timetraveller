module.exports = onConnection

var Model = require('../lib/model')
var model = Model.getInstance()
model.connect()

function onConnection (socket) {
  socket.on('get_trajectory_points', function(data) {
    var slice = true
    data.timestamp = data.timestamp || Date.now()
    data.speed = data.speed || 1
    var preloadTime = 1000*60 * data.speed // 1 minute displayed time

    // find trajectories
    model.getMap(data.id, function(err, map) {
      var query = {
        bounds: data.bounds,
        time: {
          start: new Date(data.timestamp),
          end: new Date(data.timestamp+preloadTime)
        }
      }

      map.findTrajectories(query, function(err, trajectory) {
        if (err) {
          console.log('Fehler', err)
          return //TODO
        }

        points = []
        durations = []

        trajectory.points.forEach(function(point, ix) {
          if (slice && point.time < query.time.start) {
            // return only future points
            return
          }

          points.push([
            point.coordinates[1],
            point.coordinates[0]
          ])
          if (ix > 0) {
            diff = point.time - trajectory.points[ix-1].time
            durations.push(diff)
          }
        })

        socket.emit('trajectory_points', {
          id: trajectory.id,
          points: points,
          durations: durations,
          entities: trajectory.entities
        })
      })
    })
  });

  socket.emit('news', { hello: 'world' });
}