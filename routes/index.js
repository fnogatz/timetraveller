var express = require('express')
var router = express.Router()

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' })
})

router.get('/map/:dataset', function (req, res, next) {
  res.render('map', {
    title: 'Map'
  })
})

module.exports = router
