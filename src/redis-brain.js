'use strict'

// Description:
//   Persist hubot's brain to redis
//
// Configuration:
//   REDISTOGO_URL or REDISCLOUD_URL or BOXEN_REDIS_URL or REDIS_URL.
//     URL format: redis://<host>:<port>[/<brain_prefix>]
//     URL format (UNIX socket): redis://<socketpath>[?<brain_prefix>]
//     If not provided, '<brain_prefix>' will default to 'hubot'.
//   REDIS_NO_CHECK - set this to avoid ready check (for exampel when using Twemproxy)
//   # CloudFoundry Vars (Use the following vars only for running in CF)
//   CF_REDIS_SERVICE - Your CloudFoundry's Redis Service name (ie. p-redis or rediscloud)
//   CF_REDIS_INSTANCE_NAME = The name you gave your service instance. This will be used as the brain_prefix
//
// Commands:
//   None

const Url = require('url')
const Redis = require('redis')

module.exports = function (robot) {
  let client, prefix, redisUrl
  const redisUrlEnv = getRedisEnv()

  if (redisUrlEnv) {
    if (redisUrlEnv === 'CF_REDIS_INSTANCE_NAME') {
      robot.logger.info(`hubot-redis-brain: Discovered redis from ${redisUrlEnv} environment variable. Pulling from VCAP`)
      redisUrl = buildCloudFoundryURL(robot)
    } else {
      robot.logger.info(`hubot-redis-brain: Discovered redis from ${redisUrlEnv} environment variable`)
      redisUrl = process.env[redisUrlEnv]
    }
  } else {
    robot.logger.info('hubot-redis-brain: Using default redis on localhost:6379')
    redisUrl = 'redis://localhost:6379'
  }

  if (process.env.REDIS_NO_CHECK) {
    robot.logger.info('Turning off redis ready checks')
  }

  const info = Url.parse(redisUrl)

  if (info.hostname === '') {
    client = Redis.createClient(info.pathname)
    prefix = (info.query ? info.query.toString() : undefined) || 'hubot'
  } else {
    client = (info.auth || process.env.REDIS_NO_CHECK)
              ? Redis.createClient(info.port, info.hostname, {no_ready_check: true})
            : Redis.createClient(info.port, info.hostname)
    prefix = (info.path ? info.path.replace('/', '') : undefined) || 'hubot'
  }

  robot.brain.setAutoSave(false)

  const getData = () =>
    client.get(`${prefix}:storage`, function (err, reply) {
      if (err) {
        throw err
      } else if (reply) {
        robot.logger.info(`hubot-redis-brain: Data for ${prefix} brain retrieved from Redis`)
        robot.brain.mergeData(JSON.parse(reply.toString()))
        robot.brain.emit('connected')
      } else {
        robot.logger.info(`hubot-redis-brain: Initializing new data for ${prefix} brain`)
        robot.brain.mergeData({})
        robot.brain.emit('connected')
      }

      robot.brain.setAutoSave(true)
    })

  if (info.auth) {
    client.auth(info.auth.split(':')[1], function (err) {
      if (err) {
        return robot.logger.error('hubot-redis-brain: Failed to authenticate to Redis')
      }

      robot.logger.info('hubot-redis-brain: Successfully authenticated to Redis')
      getData()
    })
  }

  client.on('error', function (err) {
    if (/ECONNREFUSED/.test(err.message)) {

    } else {
      robot.logger.error(err.stack)
    }
  })

  client.on('connect', function () {
    robot.logger.debug('hubot-redis-brain: Successfully connected to Redis')
    if (!info.auth) { getData() }
  })

  robot.brain.on('save', (data) => {
    if (!data) {
      data = {}
    }
    client.set(`${prefix}:storage`, JSON.stringify(data))
  })

  robot.brain.on('close', () => client.quit())
}

function getRedisEnv () {
  if (process.env.REDISTOGO_URL) {
    return 'REDISTOGO_URL'
  }

  if (process.env.REDISCLOUD_URL) {
    return 'REDISCLOUD_URL'
  }

  if (process.env.BOXEN_REDIS_URL) {
    return 'BOXEN_REDIS_URL'
  }

  if (process.env.REDIS_URL) {
    return 'REDIS_URL'
  }

  if (process.env.CF_REDIS_SERVICE) {
    return 'CF_REDIS_INSTANCE_NAME'
  }
}

function buildCloudFoundryURL (robot) {
  let host, hubotInstance
  let services
  try {
    services = JSON.parse(process.env.VCAP_SERVICES)
  } catch (e) {
    services = process.env.VCAP_SERVICES
  }
  const redisService = services[process.env.CF_REDIS_SERVICE]
  const instanceName = process.env.CF_REDIS_INSTANCE_NAME || null
  if (instanceName) {
    for (let instance of redisService) {
      if (instance['name'] === instanceName) {
        hubotInstance = instance
        break
      }
    }
    if (!hubotInstance) {
      robot.logger.info('Could not find redis instance; reverting to localhost')
      return 'redis://localhost:6379'
    }
  } else {
    robot.logger.info('CF_REDIS_INSTANCE_NAME environment variable not set; reverting to localhost')
    return 'redis://localhost:6379'
  }
  const redisCreds = hubotInstance['credentials']
  if (redisCreds['hostname'] === undefined) {
    host = redisCreds['host']
  } else {
    host = redisCreds['hostname']
  }
  const redisURL = 'redis://:' + redisCreds['password'] +
    '@' + host +
    ':' + redisCreds['port'] + '/' + process.env.CF_REDIS_INSTANCE_NAME
  return redisURL
}
