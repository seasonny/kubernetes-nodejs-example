'use strict'

const Express = require('express')
const Redis = require('ioredis')
const logger = require('winston')
const winstonGke = require('winston-gke')
const callbackToPromise = require('promise-callback')
const logLevel = process.env.LOG_LEVEL || 'info'
const port = process.env.PORT || 3001
const redisUri = process.env.REDIS_URI || 'redis://127.0.0.1:6379'
var ip = require("ip");

// do not let start process without the DB uri, helps devops
if (!redisUri) {
  throw new Error('REDIS_URI is required')
}

const app = Express()
const redis = Redis(redisUri)

// configure winston for Google Cloud log format
logger.remove(logger.transports.Console)
winstonGke(logger, logLevel)

// router
app.get('/', (req, res) => {
  redis.get('foo')
    .then((foo) => res.json({
      foo
    }))
    .catch((err) => next(err))
})

// health check
app.get('/healthz', (req, res, next) => {
  redis.ping()
    .then(() => res.sendStatus(200))
    .catch((err) => next(err))
})

app.get('/ip', (req, res) => {
  res.send(ip.address());
})

app.get('/foo', (req, res) => {
  res.send(req.originalUrl);
})

app.get('/bar', (req, res) => {
  res.send(req.originalUrl);
})

// start server after all db available
redis.on('connect', () => {
  logger.info('Redis connection established')

  app.listen(port, () => {
    logger.info(`Example app listening on port ${port}!`)
  })
})

// graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received')

  // close server first
  callbackToPromise(app.close)
    // than db(s)
    .then(() => redis.disconnect())
    // exit process
    .then(() => {
      logger.info('Succesfull graceful shutdown')
      process.exit(0)
    })
    .catch((err) => {
      logger.error('Server close')
      process.exit(-1)
    })
})
