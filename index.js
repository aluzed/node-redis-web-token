/**
* redis-web-token
*
* Library that is designed to be multiple technology compliant.
* Inspired by json-web-token.
*
* JWT references :
* https://www.codementor.io/olatundegaruba/5-steps-to-authenticating-node-js-with-jwt-7ahb5dmyr
*
* Author: Alexandre PENOMBRE <aluzed@gmail.com>
* Copyright 2017
*/
const redis = require('redis');
let redisConfig = {
  host   : 'localhost',
  port   : 6379,
  prefix : 'sess:'
};
let redisConnection = null;

module.exports = (config) => {
  // Sanitize config parameter
  config = {
    redis  : Object.assign(redisConfig, config.redis || {}),
    custom : Object.assign({
      expire             : 60 * 60,
      verifyExtendsToken : false
    }, config.custom || {})
  };

  if(typeof config.custom.expire !== 'number' || typeof config.custom.verifyExtendsToken !== 'boolean')
    throw new Error('Bad parameter in custom config : { expire: Number, verifyExtendsToken: Boolean }.');

  let defaultCustom = {
    expire             : config.custom.expire,
    verifyExtendsToken : config.custom.verifyExtendsToken
  };

  /**
  * ObjectToHashMultiple function
  *
  * Turns an object into hash multiple redis format
  *
  * @param {Object} obj
  * @return {Array}
  */
  function ObjectToHashMultiple(obj) {
    if(typeof obj !== 'object')
      throw new Error('Error, parameter must be type of object');

    const arr = [];

    for(let key in obj) {
      if(!!obj[key]) {
        arr.push(key);
        arr.push(obj[key].toString() || "");
      }
    }

    return arr;
  }

  /**
  * UID generator function
  *
  * from : https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  */
  function UID() {
    function random() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return random() + '-' + random() + '-' + random() + '-' + random() + '-' + random();
  }

  /**
  * ExtendTokenValidity function
  *
  * To extend the life of our token like in php session
  *
  * @param {String} encodedToken
  * @param {Function} callback
  * @constraint encodedToken must exist
  */
  function ExtendTokenValidity(encodedToken, callback) {
    if (typeof encodedToken !== 'string')
      throw new Error('encodedToken parameter must be type of string');

    redisConnection.expire(encodedToken, defaultCustom.expire, (err) => {
      if(err && typeof callback === 'function')
        return callback(err);

      if(typeof callback === 'function')
        return callback(null);
    });
  }

  const RWT = {
    /**
    * sign method
    *
    * Authenticates the user. Default session duration : 1 hour
    *
    * @param {Object} User
    * @param {String} secret
    * @param {Object} params
    * @param {Function} callback(err, token)
    * @constraint userObject must exist
    * @constraint secret must exist
    */
    sign: (userObject, secret, params, callback) => {
      // Reconnect if connection is down
      if(!redisConnection)
        RWT.connect();

      if(typeof userObject !== 'object')
        throw new Error('userObject parameter must type of object');

      if(typeof secret !== 'string')
        throw new Error('secret parameter must be type of string');

      params = Object.assign(defaultCustom, params);

      const token = UID();
      const encodedToken = new Buffer(token + secret).toString('base64');

      redisConnection.hmset(encodedToken, ObjectToHashMultiple(userObject), (err, res) => {
        if(err)
          callback(err);

        redisConnection.expire(encodedToken, params.expire);

        // Return our hashed token
        callback(null, token);
      });
    },
    /**
    * verify method
    *
    * Checks a token validity
    *
    * @param {String} token
    * @param {String} secret
    * @param {Function} callback(err, userObject)
    * @constraint token must exist
    * @constraint secret must exist
    */
    verify: (token, secret, callback) => {
      // Reconnect if connection is down
      if(!redisConnection)
        RWT.connect();

      if (typeof token !== 'string')
        throw new Error('token parameter must be type of string');

      if(typeof secret !== 'string')
        throw new Error('secret parameter must be type of string');

      // Get the concat token
      let encodedToken = new Buffer(token + secret).toString('base64');

      redisConnection.hgetall(encodedToken, (err, userObject) => {
        if(err)
          callback(err);

        // If verify method extends our token validity
        if(defaultCustom.verifyExtendsToken)
          ExtendTokenValidity(encodedToken);

        callback(null, userObject);
      });
    },
    /**
    * destroy method
    *
    * Invalid a token in redis
    *
    * @param {String} token
    * @param {String} secret
    * @param {Function} callback(err)
    * @constraint token must exist
    * @constraint secret must exist
    */
    destroy: (token, secret, callback) => {
      // Reconnect if connection is down
      if(!redisConnection)
        RWT.connect();

      if (typeof token !== 'string')
        throw new Error('token parameter must be type of string');

      if (typeof secret !== 'string')
        throw new Error('secret parameter must be type of string');

      let encodedToken = new Buffer(token + secret).toString('base64')

      redisConnection.del(encodedToken, (err) => {
        if(err)
          callback(err);

        callback(null);
      });
    },
    /**
    * extend method
    *
    * Extend token life
    *
    * @param {String} token
    * @param {String} secret
    * @param {Function} callback(err)
    * @constraint token must exist
    * @constraint secret must exist
    */
    extend: (token, secret, callback) => {
      // Reconnect if connection is down
      if(!redisConnection)
        RWT.connect();

      if (typeof token !== 'string')
        throw new Error('token parameter must be type of string');

      if (typeof secret !== 'string')
        throw new Error('secret parameter must be type of string');

      let encodedToken = new Buffer(token + secret).toString('base64')

      ExtendTokenValidity(encodedToken, (err) => {
        if(err)
          callback(err);

        callback(null);
      });
    },
    /**
    * disconnect method
    *
    * Secure socket disconnection from redis
    *
    */
    disconnect: () => {
      redisConnection.quit();
      redisConnection = null;
    },
    /**
    * connect method
    *
    * Reconnect to redis server
    */
    connect: () => {
      // If connection already set return
      if(!!redisConnection)
        return;

      redisConnection = redis.createClient(config.redis);

      redisConnection.on('error', (err) => {
        console.log('redis-web-token connection error.');
        console.log(err);
      });
    }
  };

  // Set our connection
  RWT.connect();

  return RWT;
}
