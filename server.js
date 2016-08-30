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


module.exports = (() => {

    const serviceURL = '/mydata'
    const dbName = 'testImages'
    const defaultDBConnection = `mongodb://localhost/${dbName}`
    const mongoCollectionName = 'collectionName'

    let mongoClient = bluebird.promisifyAll(mongodb).MongoClient;

    let port = process.env.PORT || 5000

    let app = express()

    let dbURI = process.env.MONGODB_URI || defaultDBConnection
    let db, grid

    console.log('dbURI', dbURI)
    mongoClient.connect(dbURI)
        .then(ddb => {
            console.log('connected to mongo')
            db = ddb
            grid = Grid(db, mongodb)
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
        let fdata = []
        let allFileData;
        req.busboy.on('file', (fieldname, readableStream, filename) => {

            readableStream.on('data', data => {
                fdata.push(data)
            })
            readableStream.on('end', () => {
                allFileData = Buffer.concat(fdata)

                let cfg = {
                    filename: filename
                }
                grid.writeFile(cfg, allFileData, (err, file) => {
                    if (err) {
                        console.log('error writing', err)
                        res.status(500).json({
                            "error": err
                        })
                    } else {
                        console.log('saved %s to GridFS file %s', filename, file._id);
                        res.json({
                            'result': 'saved to GridFS file '
                        })
                    }
                })
            })

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
