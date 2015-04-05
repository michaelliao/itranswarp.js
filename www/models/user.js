'use strict';

// user.js

var constants = require('../constants');

var base = require('./_base');

module.exports = function (warp) {
    return base.defineModel(warp, 'User', [
        base.column_bigint('role', { defaultValue: constants.ROLE_SUBSCRIBER }),
        base.column_varchar_100('name'),
        base.column_varchar_100('email', { unique: true, validate: { isEmail: true, isLowercase: true }}),
        base.column_varchar_100('passwd', { defaultValue: '' }),
        base.column_boolean('verified'),
        base.column_varchar_1000('image_url'),
        base.column_bigint('locked_until')
    ], {
        table: 'users'
    });
};
