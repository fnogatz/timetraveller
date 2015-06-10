module.exports = Model

var util = require('util')
var path = require('path')
var childProcess = require('child_process')
var MongoClient = require('mongodb').MongoClient
var validator = require('validator')
var async = require('async')

var BaseModel = require('./model')
var config = require('require-all')(path.resolve(__dirname, '../config'))
var mongoConf = config.database.connectors.mongodb

function Model () {
  this.connector = 'MongoDB'
  this._db = null
}

util.inherits(Model, BaseModel)

Model.NOT_ALLOWED_IDS = [
  'config',
  'admin',
  'new',
  'edit',
  'setup',
  'local',
  'maps'
]

Model.prototype.isValidId = function isValidId (id) {
  return !validator.isIn(id, Model.NOT_ALLOWED_IDS)
}

Model.prototype.connect = function connect (callback) {
  var self = this
  callback = callback || function () {}

  MongoClient.connect(mongoConf.url, function (err, db) {
    if (err) {
      return callback(err)
    }

    self._db = db

    return callback(null)
  })
}

Model.prototype.close = function close (callback) {
  var self = this

  this._db.close(callback)
}

Model.prototype.createMap = function createMap (id, obj, callback) {
  callback = callback || function () {}

  var maps = this._db.collection('maps')

  var doc = {
    _id: id,
    name: obj.name,
    slug: obj.slug,
    tiles: config.maptiles
  }

  maps.findOne({
    _id: id
  }, function (err, item) {
    if (err) {
      return callback(err)
    }

    if (item !== null) {
      return callback(new Error('ID "' + id + '" already in use.'))
    }

    maps.insert(doc, callback)
  })
}

Model.prototype.getMap = function getMap (id, callback) {
  var self = this
  callback = callback || function () {}

  this._db.collection('maps').findOne({
    _id: id
  }, function (err, item) {
    if (err) {
      return callback(err)
    }

    if (item === null) {
      return callback(new Error('Map with ID ' + id + ' not found'))
    }

    var map = new Map(id, self._db, item)

    callback(null, map)
  })
}

Model.prototype.getMapBySlug = function getMapBySlug (slug, callback) {
  var self = this
  callback = callback || function () {}

  this._db.collection('maps').findOne({
    slug: slug
  }, function (err, item) {
    if (err) {
      return callback(err)
    }

    if (item === null) {
      return callback(new Error('Map with ID ' + id + ' not found'))
    }

    var map = new Map(item._id, self._db, item)

    callback(null, map)
  })
}

function Map (id, db, item) {
  this.id = id
  this._db = db
  this._trajectories = db.collection(id + '_trajectories')

  this.slug = item.slug
  this.tiles = item.tiles
}

Map.prototype.importGTFS = function importGTFS (dir, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  callback = callback || function () {}

  var id = this.id
  var transportationCLI = path.resolve(__dirname, '..', 'node_modules', 'transportation', 'bin', 'transportation')
  var db = this._db

  var imports = {
    positions: {
      command: transportationCLI,
      arguments: [
        'positions',
        '-i 0',
        '--mongo',
        '--date "' + options.date + '"',
        dir
      ],
      collection: id + '_trajectories',
      index: function (db, callbackIndexCreated) {
        db.ensureIndex(id + '_trajectories', {
          'loc.features.geometry': '2dsphere'
        }, function (err, indexName) {
          if (err) { throw err; }

          console.log('Index "' + indexName + '" for collection "' + id + '_trajectories" created.')
          callbackIndexCreated()
        })
      }
    } /*,
    shapes: {
      command: transportationCLI,
      arguments: ['shapes', '-i 0', dir],
      collection: 'shapes',
      index: function(db, callbackIndexCreated) {
        db.ensureIndex('shapes', {
          'loc.geometry': '2dsphere'
        }, function (err, indexName) {
          if (err) { throw err; }

          console.log('Index "'+indexName+'" for collection "shapes" created.')
          callbackIndexCreated()
        })
      }
    }*/
  }
  var tasks = {}
  var toImport = options.collection ? [ options.collection ] : Object.keys(imports)
  toImport.forEach(function (prop) {
    tasks[prop] = (function (prop) { return function (callbackTaskFinished) {
        console.log('Start import of "' + imports[prop].collection + '"')

        var command = imports[prop].command + ' ' + imports[prop].arguments.join(' ') + ' | mongoimport -d ' + getDatabaseName(mongoConf.url) + ' -c ' + imports[prop].collection
        childProcess.exec(command, function (err, data) {
          if (err) { console.log('Error', err) }

          console.log(data)
          console.log('"' + imports[prop].collection + '" imported')

          if (!imports[prop].index || options.withoutIndex) {
            callbackTaskFinished()
            return
          }

          // create index
          imports[prop].index(db, callbackTaskFinished)
        })
      }})(prop)
  })

  async.series(tasks, function (err) {
    if (err) { throw err }

    callback(null)
  })
}

Map.prototype.importCSV = function importCSV (file, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  callback = callback || function () {}

  var id = this.id
  var importCLI = path.resolve(__dirname, '..', 'bin', 'timetraveller')
  var db = this._db

  var imports = {
    positions: {
      command: importCLI,
      arguments: [
        'geojson',
        'csv',
        '-i 0',
        '--lat "30,50"',   // TODO: Beijing dependent
        '--lon "105,130"',
        '--mongo',
        file
      ],
      collection: id + '_trajectories',
      index: function (db, callbackIndexCreated) {
        db.ensureIndex(id + '_trajectories', {
          'loc.features.geometry': '2dsphere'
        }, function (err, indexName) {
          if (err) { throw err; }

          console.log('Index "' + indexName + '" for collection "' + id + '_trajectories" created.')
          callbackIndexCreated()
        })
      }
    }
  }
  var tasks = {}
  var toImport = options.collection ? [ options.collection ] : Object.keys(imports)
  toImport.forEach(function (prop) {
    tasks[prop] = (function (prop) { return function (callbackTaskFinished) {
        console.log('Start import of "' + imports[prop].collection + '"')

        var command = imports[prop].command + ' ' + imports[prop].arguments.join(' ') + ' | mongoimport -d ' + getDatabaseName(mongoConf.url) + ' -c ' + imports[prop].collection
        childProcess.exec(command, function (err, data) {
          if (err) { console.log('Error', err) }

          console.log(data)
          console.log('"' + imports[prop].collection + '" imported')

          if (!imports[prop].index || options.withoutIndex) {
            callbackTaskFinished()
            return
          }

          // create index
          imports[prop].index(db, callbackTaskFinished)
        })
      }})(prop)
  })

  async.series(tasks, function (err) {
    if (err) { throw err }

    callback(null)
  })
}

Map.prototype.mapTime = function mapTime (time) {
  if (this.slug !== 'Ulm') {
    return time
  }

  [ 'start', 'end' ].forEach(function (what) {
    if (!(time[what] instanceof Date)) {
      time[what] = new Date(time[what])
    }

    while (time[what] < new Date('2015-04-13 00:00')) {
      time[what] = new Date(time[what].getTime() + 7 * 24 * 60 * 60 * 1000)
    }
    while (time[what] >= new Date('2015-04-20 00:00')) {
      time[what] = new Date(time[what].getTime() - 7 * 24 * 60 * 60 * 1000)
    }
  })

  return time
}

Map.prototype.findTrajectories = function findTrajectories (query, callback) {
  var bounds = query.bounds
  var time = query.time

  time = this.mapTime(time)

  if (!(time.start instanceof Date)) {
    time.start = new Date(time.start)
  }
  if (!(time.end instanceof Date)) {
    time.end = new Date(time.end)
  }

  this._trajectories.find({
    'loc.features.geometry': {
      '$geoWithin': {
        '$geometry': {
          type: 'Polygon',
          coordinates: [[
            [ bounds.east , bounds.north ],
            [ bounds.west , bounds.north ],
            [ bounds.west , bounds.south ],
            [ bounds.east , bounds.south ],
            [ bounds.east , bounds.north ]
          ]]
        }
      }
    },
    'loc.features.properties.time': {
      '$gte': time.start, // new Date("2015-04-13T18:10:00"),
      '$lte': time.end // new Date("2015-04-13T18:50:00")
    }
  }).each(function (err, doc) {
    if (err) {
      // TODO
      console.log('Fehler: ', err)
    }

    if (!doc)
      return

    callback(null, {
      id: doc._id,
      points: doc.loc.features.map(function (feature) {
        return {
          coordinates: feature.geometry.coordinates,
          time: feature.properties.time,
          distance: feature.properties.distance,
          travelDistance: feature.properties.travelDistance
        }
      }),
      entities: doc.entities
    })
  })
}

function getDatabaseName (str) {
  return str.replace(/^.+\/([^\/]+)$/, '$1')
}
