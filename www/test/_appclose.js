'use strict';

/**
 * Test fixture for close app.
 */

const
    bluebird = require('bluebird'),
    sleep = require('sleep-promise'),
    logger = require('../logger');

async function appclose() {
    let close = bluebird.promisify($SERVER.close, { context: $SERVER });
    await close();
    logger.info('app closed.');
    await sleep(200);
}

module.exports = appclose;
