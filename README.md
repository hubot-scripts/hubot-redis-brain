[![Build Status](https://travis-ci.org/hubotio/hubot-redis-brain.svg?branch=master)](https://travis-ci.org/hubotio/hubot-redis-brain) [![Coverage Status](https://coveralls.io/repos/github/hubotio/hubot-redis-brain/badge.svg?branch=master)](https://coveralls.io/github/hubotio/hubot-redis-brain?branch=master)

# hubot-redis-brain

A hubot script to persist hubot's brain using redis

See [`src/redis-brain.js`](src/redis-brain.js) for full documentation.

## Installation

In hubot project repo, run:

`npm install hubot-redis-brain --save`

Then add **hubot-redis-brain** to your `external-scripts.json`:

```json
[
  "hubot-redis-brain"
]
```

## Configuration

hubot-redis-brain requires a redis server to work. It uses the `REDIS_URL` environment variable for determining
where to connect to. The default is on localhost, port 6379 (ie the redis default).

The following attributes can be set using the `REDIS_URL`

* authentication
* hostname
* port
* key prefix

For example, `export REDIS_URL=redis://:password@192.168.0.1:16379/prefix` would
authenticate with `password`, connecting to `192.168.0.1` on port `16379`, and store
data using the `prefix:storage` key.

For a UNIX domain socket, `export REDIS_URL=redis://:password@/var/run/redis.sock?prefix` would authenticate with `password`, connecting to `/var/run/redis.sock`, and store data using the `prefix:storage` key.

### Installing your own

If you need to install and
run your own, most package managers have a package for redis:

* Mac OS X with homebrew: `brew install redis`
* Ubuntu/Debian with apt: `apt-get install redis-server`
* Compile from source: http://redis.io/topics/quickstart

### Boxen

If you are using [boxen](https://boxen.github.com/) to manage your environment,
hubot-redis-brain will automatically use the boxen-managed redis (ie by using `BOXEN_REDIS_URL`).

### Heroku

If you are deploying on [Heroku](https://www.heroku.com/), you can add the
Redis Cloud or Redis To Go addon to have automatically configure itself to use it:

* [Redis Cloud](https://addons.heroku.com/rediscloud)
* [Redis To Go](https://addons.heroku.com/redistogo)

### CloudFoundry

If you are deploying in a CloudFoundry environment, you can use any redis service available in your marketplace.

You'll need to set two environment variables in this case: 
`CF_REDIS_SERVICE` - Your CloudFoundry's Redis Service name (ie. p-redis or rediscloud) 
`CF_REDIS_INSTANCE_NAME` - The name you gave your service instance. This will be used as the brain_prefix 

### Other

Other redis addons would need to be configured using `REDIS_URL` until support
is added to hubot-redis-brain (or hubot-redis-brain needs to be updated to look
  for the environment variable the service uses)

### Redis Twemproxy

If you are using [Twemproxy](https://github.com/twitter/twemproxy) to cluster redis,
you need to turn off the redis ready check which uses the unsupported INFO cmd.

`REDIS_NO_CHECK = 1`
