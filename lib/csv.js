module.exports = loadCSV

var csv = require('csv')
var concat = require('concat-stream')
var fs = require('fs')

function loadCSV (filename, options, callback) {
  fs.createReadStream(filename)
    .pipe(csv.parse(options))
    .pipe(concat(callback))
}
