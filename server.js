#!/usr/bin/env node

'use strict'

const busboy = require('connect-busboy')
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
    app.use(busboy())

    let saveImage = (req, res) => {
        console.log('handling')
        req.pipe(req.busboy)

        req.busboy.on('file', (fieldname, readableStream, filename) => {
            console.log(`someone is posting a file with fieldname ${fieldname} filename ${filename}`)
            let writeStream = gridStream.createWriteStream({
                filename: filename,
                metadata: {
                    title: "bananas"
                }
            })
            readableStream.on('error', err => {
                console.log('readable stream error', err)
                res.status(500).json({
                    "error": err
                })
            })
            writeStream.on('error', err => {
                console.log('error', err)
                res.status(500).json({
                    "error": err
                })
            })
            readableStream.on('end', x => {
                res.json({
                    "result": `saved ${filename} to gridfs ${x}`
                })
            })
            readableStream.pipe(writeStream)
        })
    }


    let getImage = (req, res) => {
        let cfg = {
            filename: 'Lennon-Core-Services-Architecture.png'
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



    app.post('/saveimage', saveImage)
    app.get('/image', getImage)

    app.listen(port, '0.0.0.0', () => {
        console.log(`listening on ${port}`)
    })

})()
