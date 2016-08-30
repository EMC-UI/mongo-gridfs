#!/usr/bin/env node

'use strict'

const multer = require('multer')
const restClient = require('request-promise')
const express = require('express')
const morgan = require('morgan')
const _ = require('underscore')
const bodyParser = require('body-parser')
const session = require('express-session')
const moment = require('moment')
const Q = require('q')
const bluebird = require('bluebird')
const Await = require('asyncawait/await')
const Async = require('asyncawait/async')
const mongodb = require('mongodb')
const gju = require('geojson-utils')
const nodemailer = require('nodemailer')
const Grid = require('gridfs')
const GridStream = require('gridfs-stream')
var upload = multer({
    storage: multer.memoryStorage()
})


module.exports = (() => {

    const serviceURL = '/mydata'
    const dbName = 'testImages'
    const defaultDBConnection = `mongodb://localhost/${dbName}`
    const mongoCollectionName = 'collectionName'

    let mongoClient = bluebird.promisifyAll(mongodb).MongoClient;

    let port = process.env.PORT || 5000

    let app = express()

    let dbURI = process.env.MONGODB_URI || defaultDBConnection
    let db, grid, gridStream

    console.log('dbURI', dbURI)
    mongoClient.connect(dbURI)
        .then(ddb => {
            console.log('connected to mongo')
            db = ddb
            grid = Grid(db, mongodb)
            gridStream = GridStream(db, mongodb)
        })
        .catch(er => {
            console.log('error connecting to mongo', er)
        })

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, contentType");
        res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
        next();
    });

    app.use(express.static('.'))

    let saveImage = (req, res) => {
        console.log('handling')
        console.log('we have req.file', req.file)
        console.log('we also have ', req.body)

        let cfg = {
            filename: req.file.originalname,
            metadata: req.body
        }

        grid.writeFile(cfg, req.file.buffer, (err, file) => {
            if (err) {
                res.status(500).json({
                    error: err
                })
            } else {
                console.log(`saved ${req.file.originalname}`)
                res.json({
                    result: `saved ${req.file.originalname}`
                })
            }
        })

    }

    let getImageInfos = (req,res) => {
      db.collection('fs.files').find({}).toArray()
        .then(results => {
          res.json(results)
        })
        .catch(err => {
          res.status(500).json({
            error: err
          })
        })
    }


    let getImage = (req, res) => {
        console.log(req.query)
        let cfg = {
            filename: req.query.filename
        }
        grid.readFile(cfg, (err, fileBuffer) => {
            if (err) {
                console.log('error reading', err, err.stack)
                res.status(500).json({
                    "error": err
                })
            } else {
                console.log('buffer len', fileBuffer.length)
                let encodedData = fileBuffer.toString('base64')
                res.json({
                    data: encodedData
                })
            }
        })
    }



    app.post('/saveimage', upload.single('file'), saveImage)
    app.get('/image', getImage)
    app.get('/imageInfos', getImageInfos)

    app.listen(port, '0.0.0.0', () => {
        console.log(`listening on ${port}`)
    })

})()
