var socket = io.connect('http://localhost:3000');


/*
var database = 'ulm'

// greeting
socket.emit('init', {
  database: database
});

socket.on('ready', function() {
  socketSendMap()
})


function socketSendMap() {
  socket.emit('map', {
    bounds: paddedBounds()
  });
}


function paddedBounds(map, percentage) {
  var bounds = map.getBounds();
  var east = bounds.getEast();
  var west = bounds.getWest();
  var diffEW = west-east;

  var north = bounds.getNorth();
  var south = bounds.getSouth();
  var diffNS = north-south;

  return {
    lon: [east - diffEW*percentage, west + diffEW*percentage],
    lat: [south - diffNS*percentage, north + diffNS*percentage]
  };
}

*/


