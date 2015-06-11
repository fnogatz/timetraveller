var path = require('path')
var req = require('require-yml')

var maps = req(path.join(__dirname, '..', 'maps'))
maps._list = []

var options
var Model
for (var id in maps) {
  if (maps[id].connector && maps[id].connector.path) {
    options = maps[id].connector
    options.id = id

    Model = require(maps[id].connector.path)

    maps[id]._connector = new Model(options)
  }

  maps._list.push({
    name: maps[id].name,
    id: id
  })
}

module.exports = maps
