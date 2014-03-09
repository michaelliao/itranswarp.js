// _id.js

var util = require('util');
var uuid = require('node-uuid');

/**
 * a id-generate function that generate 50-chars id string with:
 *   current timestamp;
 *   random uuid;
 *   server shard number (0 ~ 0xff, default to 0).
 */
exports = module.exports = function() {
    // generate uuid with timestamp:
    var id = util.format('%d%s000', new Date().getTime(), uuid.v4().replace(/\-/g, ''));
    return id.length >= 50 ? id : new Array(50 - id.length + 1).join('0') + id;
}
