// home.js

var
    async = require('async'),
    db = require('../db'),
    utils = require('./_utils'),
    themes = require('../themes'),
    constants = require('../constants');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp;

var
    themePath = themes.themePath,
    themeDefaults = themes.themeDefaults;

exports = module.exports = {

    'GET /': function(req, res, next) {
        return res.render(themePath('index.html'), themeDefaults(req, {}));
    }
};
