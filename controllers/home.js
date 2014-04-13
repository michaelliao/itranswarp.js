// home.js

var
    async = require('async'),
    db = require('../db'),
    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp;

exports = module.exports = {

    'GET /': function(req, res, next) {
        return res.theme('index.html');
    }
};
