module.exports = Model

var util = require('util')
var path = require('path')
var childProcess = require('child_process')
var validator = require('validator')
var async = require('async')
var mysql = require('mysql')
var concat = require('concat-stream')

var BaseModel = require('./model')
var config = require('require-all')(path.resolve(__dirname, '../config'))
var mysqlConf = config.database.connectors.mysql

function Model() {
  this.connector = 'MySQL'
  this._connection = null
}

util.inherits(Model, BaseModel);

Model.NOT_ALLOWED_IDS = [
  'config',
  'admin',
  'new',
  'edit',
  'setup',
  'local',
  'maps',
  'coordinates',
  'entities'
]

Model.prototype.isValidId = function isValidId(id) {
  return !validator.isIn(id, Model.NOT_ALLOWED_IDS)
}

Model.prototype.connect = function connect(callback) {
  var self = this
  callback = callback || function() {}

  var connection = mysql.createConnection(mysqlConf)

  connection.connect(function(err) {
    if (err) {
      callback(err)
      return
    }

    self._connection = connection

    callback(null)
  })
}

Model.prototype.close = function close(callback) {
  var self = this
  callback = callback || function() {}

  this._connection.end(callback)
}

Model.prototype.createMap = function createMap(id, obj, callback) {
  callback = callback || function() {}

  var doc = {
    id: id,
    name: obj.name,
    slug: obj.slug
  }

  this._connection.query('INSERT INTO maps SET ?', doc, function(err, result) {
    if (err) {
      return callback(err)
    }

    callback(null)
  })
}

Model.prototype.getMap = function getMap(id, callback) {
  var self = this
  callback = callback || function() {}

  this._connection.query(
    'SELECT id, name, slug FROM maps WHERE id = ?',
    [ id ],
    function (err, results, fields) {
      if (err) {
        return callback(err)
      }

      var item = results[0]

      var map = new Map(id, self._connection, item)

      callback(null, map)
    })
}

Model.prototype.getMapBySlug = function getMapBySlug(slug, callback) {
  var self = this
  callback = callback || function() {}

  this._connection.query(
    'SELECT id, name, slug FROM maps WHERE slug = ?',
    [ slug ],
    function (err, results, fields) {
      if (err) {
        return callback(err)
      }

      var item = results[0]
      var id = item.id

      var map = new Map(id, self._connection, item)

      callback(null, map)
    })
}

function Map(id, connection, item) {
  this.id = id
  this._connection = connection

  this.slug = item.slug
  this.tiles = config.maptiles
}

Map.prototype.importGTFS = function importGTFS(dir, options, callback) {
  var self = this

  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  callback = callback || function() {}

  var id = this.id
  var transportationCLI = path.resolve(__dirname, '..', 'node_modules', 'transportation', 'bin', 'transportation')

  var arguments = [
    'positions',
    '-i',
    '0',
    '--date',
    '"'+options.date+'"',
    '--array',
    /*'--datasets',
    '1',*/
    dir
  ]

  var transportation = childProcess.spawn(transportationCLI, arguments)
  transportation.stdout.pipe(concat(function(buff) {
    console.log('Buffer received')
    var arr = JSON.parse(buff.toString())
    console.log('Buffer parsed')

    var a = 0
    
    async.eachSeries(arr, function(traj, callback) {
      if (a++ % 100 === 0) {
        console.log('Add data no '+a)
      }

      var entities = [ 'longName', 'shortName' ].map(function(what) {
        return [
          traj._id,
          what,
          traj.entities.route[what]
        ]
      })

      self._connection.query('INSERT INTO entities (id, entity, value) VALUES ?', [ entities ], function(err, res) {
        if (err) {
          console.log(err)
        }

        var coordinates = traj.loc.features.map(function(feature) {
          return [
            traj._id,
            feature.properties.time,
            feature.geometry.coordinates[0],
            feature.geometry.coordinates[1]
          ]
        })

        self._connection.query('INSERT INTO coordinates (id, date, lon, lat) VALUES ?', [ coordinates ], function(err, res) {
          if (err) {
            console.log(err)
          }

          callback(null)
        })
      })
    }, function() {
      console.log('Import finished')
    })
  }))
}
/*
Map.prototype.importCSV = function importCSV(file, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  callback = callback || function() {}

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
      collection: id+'_trajectories',
      index: function(db, callbackIndexCreated) {
        db.ensureIndex(id+'_trajectories', {
          'loc.features.geometry': '2dsphere'
        }, function(err, indexName) {
          if (err) { throw err; }

          console.log('Index "'+indexName+'" for collection "'+id+'_trajectories" created.');
          callbackIndexCreated();
        });
      }
    }
  }
  var tasks = {}
  var toImport = options.collection ? [ options.collection ] : Object.keys(imports);
  toImport.forEach(function(prop) {
    tasks[prop] = (function(prop){ return function(callbackTaskFinished) {
      console.log('Start import of "'+imports[prop].collection+'"')

      var command = imports[prop].command+' '+imports[prop].arguments.join(' ')+' | mongoimport -d '+getDatabaseName(mongoConf.url)+' -c '+imports[prop].collection;
      childProcess.exec(command, function(err, data) {
        if (err) { console.log('Error', err) }

        console.log(data)
        console.log('"'+imports[prop].collection+'" imported')

        if (!imports[prop].index || options.withoutIndex) {
          callbackTaskFinished()
          return
        }

        // create index
        imports[prop].index(db, callbackTaskFinished)
      })
    }})(prop)
  })

  async.series(tasks, function(err) {
    if (err) { throw err }

    callback(null)
  })
}
*/
Map.prototype.mapTime = function mapTime(time) {
  if (this.slug !== 'Ulm') {
    return time
  }

  [ 'start', 'end' ].forEach(function(what) {
    if (!(time[what] instanceof Date)) {
      time[what] = new Date(time[what])
    }

    while (time[what] < new Date('2015-04-13 00:00')) {
      time[what] = new Date(time[what].getTime()+7*24*60*60*1000)
    }
    while (time[what] >= new Date('2015-04-20 00:00')) {
      time[what] = new Date(time[what].getTime()-7*24*60*60*1000)
    }
  })

  return time
}

Map.prototype.findTrajectories = function findTrajectories(query, callbackTrajectory) {
  var self = this

  var bounds = query.bounds
  var time = query.time

  time = this.mapTime(time)

  if (!(time.start instanceof Date)) {
    time.start = new Date(time.start)
  }
  if (!(time.end instanceof Date)) {
    time.end = new Date(time.end)
  }

  this._connection.query(
    'SELECT DISTINCT id FROM coordinates WHERE lat >= ? AND lat <= ? AND lon >= ? AND lon <= ? AND date >= ? AND date <= ?',
    [ bounds.south, bounds.north, bounds.west, bounds.east, time.start, time.end ],
    function (err, results, fields) {
      if (err) {
        console.log('Fehler', err)
      }

      var ids = results.map(function(r) { return r.id })

      async.eachSeries(ids, function(id, callback) {
        self._connection.query('SELECT date, lon, lat FROM coordinates WHERE id = ? ORDER BY date ASC', [ id ], function(err, coordinates) {
          if (err) {
            console.log('Fehler', err)
          }

          var res = {
            id: id,
            entities: {
              route: {
                longName: 'Test',
                shortName: 'Test'
              }
            },
            points: coordinates.map(function(row) {
              return {
                coordinates: [ row.lon, row.lat ],
                time: row.date
              }
            })
          }

          self._connection.query('SELECT * FROM entities WHERE id = ?', [ id ], function(err, results) {
            if (err) {
              console.log('Fehler', err)
            }

            results.forEach(function(entityRow) {
              res.entities.route[entityRow.entity] = entityRow.value
            })
            callbackTrajectory(null, res)
            callback(null)
          })
        })
      })
    })
}

function getDatabaseName(str) {
  return str.replace(/^.+\/([^\/]+)$/, '$1')
}
