// Copyright 2016 Yahoo Inc.
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

var Promise = require('bluebird');
var hash = require('incoming-message-hash');
var assert = require('assert');
var mkdirp = require('mkdirp');
var path = require('path');
var buffer = require('./lib/buffer');
var proxy = require('./lib/proxy');
var record = require('./lib/record');
var debug = require('debug')('yakbak:server');

/**
 * Returns a new yakbak proxy middleware.
 * @param {String} host The hostname to proxy to
 * @param {Object} opts
 * @param {String} opts.dirname The tapes directory
 * @returns {Function}
 */

module.exports = function (host, opts) {
  assert(opts.dirname, 'You must provide opts.dirname');

  return function (req, res) {
    mkdirp.sync(opts.dirname);

    debug('req', req.url);

    return buffer(req).then(function (body) {
      var file = path.join(opts.dirname, tapename(req, body));

      return Promise.try(function () {
        return require.resolve(file);
      }).catch(ModuleNotFoundError, function (err) {
        return proxy(req, body, host).then(function (res) {
          return record(res.req, res, file);
        });
      });

    }).then(function (file) {
      return require(file);
    }).then(function (tape) {
      return tape(req, res);
    });

  };

};

/**
 * Returns the tape name for `req`.
 * @param {http.IncomingMessage} req
 * @param {Array.<Buffer>} body
 * @returns {String}
 */

function tapename(req, body) {
  return hash.sync(req, Buffer.concat(body)) + '.js';
}

/**
 * Bluebird error predicate for matching module not found errors.
 * @param {Error} err
 * @returns {Boolean}
 */

function ModuleNotFoundError(err) {
  return err.code === 'MODULE_NOT_FOUND';
}
