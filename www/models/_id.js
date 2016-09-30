/**
 * the ID generator always generates 50-chars string:
 *
 * var next_id = require('_id');
 * var the_id = next_id();
 */

const
    util = require('util'),
    uuid = require('node-uuid');

var i, paddings = [];

for (i = 1; i < 30; i++) {
    paddings.push(new Array(i).join('0'));
}

/**
 * a id-generate function that generate 50-chars id string with:
 *   current timestamp;
 *   random uuid;
 *   server shard number (0 ~ 0xff, default to 0).
 */
function next_id () {
    // generate uuid with timestamp:
    var id = util.format('%d%s000', Date.now(), uuid.v4().replace(/\-/g, ''));
    return paddings[50 - id.length] + id;
}
