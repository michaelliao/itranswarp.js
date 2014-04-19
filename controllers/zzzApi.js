// zzz api

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    constants = require('../constants');

var
    warp = db.warp,
    next_id = db.next_id;

function getNavigationMenus(callback) {
    callback(null, [{
        name: 'Custom',
        url: 'http://'
    }]);
}

exports = module.exports = {

    getNavigationMenus: getNavigationMenus

}
