# Redis Web Token with Node

## Why ?

In order to share our authentication between multiple instance and whatever technology you use, using RWT will bring some simplicity to all that stuff.
By using third part component (redis), we'll be able to check token in each microservice.

```
  ----------       ----------------
  | redis  | <-----|  PHP worker  |
  ----------       ----------------
    ^   ^
    |   |        ---------------------
    |   ---------|  Node instance 1  |
    |            ---------------------
    |
    |            ---------------------
    -------------|  Node instance 2  |
                 ---------------------

```

## Usage

```javascript
const rwt = require('redis-web-token')({
  // Redis server configuration
  redis: {
    host: ...,
    port: ...,
    ...,
  },
  // Custom RWT configuration
  custom: {
    expire: ...,
    verifyExtendsToken: ...
  }
});

// Authenticate :
rwt.sign({ userKey1: val1, userKey2: val2, ... }, 'yourAppSecret', { expire: time in seconds }, (err, token) => {
  if(err)
    //Handle error

  // Handle succes with token variable
});

// Verify token :
rwt.verify(token, 'yourAppSecret', (err, user) => {
  if(err || !user)
    // Handle error

  // Handle success
});

// Destroy token :
rwt.verify(token, 'yourAppSecret', (err) => {
  if(err)
    // Handle error

  // Handle success
});

// Extend token life :
rwt.extend(token, 'yourAppSecret', (err) => {
  if(err)
    // Handle error

  // Handle success
});
```

---

## RWT Parameters

When you require RWT, you should pass extra parameters to the function :

* {Object} Redis configuration, for example host, port, prefix...
* {Object} Custom RWT configuration, see options

## RWT Custom Parameters Options

| Parameter          | Type    | Details                                                             |
|--------------------|:--------|:--------------------------------------------------------------------|
| expire             | Number  | Set the token TTL in seconds                                        |
| verifyExtendsToken | Boolean | Extend automatically the token life each time we check its validity |

---

## Methods

### sign

Generate the redis token.

**Parameters**

* {Object} User object
* {String} Secret
* {Object} expire key : Custom expire date (be careful with this value, if you use revive, your global expire configuration will overwrite this value each time we'll call verify method).
* {Function} Callback (err, token)

### verify

Check if hour token is alive an return the User object values we set at connection, if you edit user values during the session, those data may be outdated. You must call the sign method each time you update your user's values.

**Parameters**

* {String} Token
* {String} Secret
* {Function} Callback (err, user)

### extend

Reset the TTL of our token with default expire value in our configuration.

**Parameters**

* {String} Token
* {String} Secret
* {Function} Callback (err)

### disconnect

To avoid process to stay alive before closing node instance. If you use disconnect method, any call to *sign*, *verify* or *extend* method will reconnect automatically.

**No parameter**

### connect

If you want to handle when you want to connect to redis server.

**No parameter**
