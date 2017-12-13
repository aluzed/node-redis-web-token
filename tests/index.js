/**
* redis-web-token test unit
*
* Author: Alexandre PENOMBRE <aluzed@gmail.com>
* Copyright 2017
*/
const assert = require('assert');
const redis  = require('redis');
const config = require('./redisConfiguration');
const chai   = require('chai');
const expect = chai.expect;
const secret = 'az3rty!';

describe('Redis Web Token Tests', () => {
  describe('lib load', () => {
    it('Should crash', () => {
      expect(() => {
        const rwt = require('../')({
          redis: config,
          custom: {
            expire: 'test'
          }
        });
      }).to.throw(Error);
    });
  });

  describe('lib use', () => {
    let tmpToken = null;
    const rwt = require('../')({
      redis: config
    });

    it('Should create token', (done) => {
      rwt.sign({ name: 'user', password: 'crypted' }, secret, {}, (err, token) => {
        tmpToken = token;
        expect(token).to.be.a('string');
        done();
      });
    });

    it('Should return our user', (done) => {
      rwt.verify(tmpToken, secret, (err, user) => {
        expect(user).to.deep.equal({ name: 'user', password: 'crypted' });
        done();
      });
    });

    it('Should destroy our user', (done) => {
      rwt.destroy(tmpToken, secret, (err) => {
        rwt.verify(tmpToken, secret, (err, user) => {
          expect(user).to.be.null;
          rwt.disconnect();
          done();
        });
      });
    });
  });
});
