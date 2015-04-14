module.exports = Model
module.exports.getInstance = getInstance

var requireAll = require('require-all')

var dbConfig = require('../config/database.json')
var models = requireAll({
  dirname: __dirname,
  filter:   /^model\.(.+)\.js$/
})

function Model() {

}

function getInstance() {
  var connector = dbConfig.use
  if (!models.hasOwnProperty(connector)) {
    throw new Error('Database connector '+connector+' doesn\'t exist')
  }

  var instance = new models[connector]()
  return instance
}
