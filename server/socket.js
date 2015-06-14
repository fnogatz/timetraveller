module.exports = onConnection

var maps = require('./maps')

function onConnection (socket) {
  socket.on('get_trajectory_points', function (data) {
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
    model.findTrajectories(query, function (trajectory) {
      socket.emit('trajectory', trajectory)
    }, function () {
      // no-op
    })
  })

  socket.on('error', function (err) {
    console.error(err)
  })
}
