// home.js

var
    _ = require('lodash'),
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

var
    articleApi = require('./articleApi'),
    categoryApi = require('./categoryApi'),
    wikiApi = require('./wikiApi'),
    commentApi = require('./commentApi'),
    pageApi = require('./pageApi'),
    userApi = require('./userApi'),
    navigationApi = require('./navigationApi'),
    settingApi = require('./settingApi');

var __website__ = {
    title: 'My Website',
    subtitle: 'Powered by iTranswarp.js',
    custom_header: '<!-- custom header -->',
    custom_footer: '<!-- custom footer -->',
};

var __website__keys__ = _.filter(_.map(__website__, function(key) {
    return __website__.hasOwnProperty(key) ? key : ''
}), function(key) {
    return key.length > 0;
});

function appendSettings(model, callback) {
    settingApi.getSettingsByDefaults('website', settingApi.defaultSettings.website, function(err, r) {
        if (err) {
            return callback(err);
        }
        model.__website__ = r;
        navigationApi.getNavigations(function(err, navigations) {
            if (err) {
                return callback(err);
            }
            model.__navigations__ = navigations;
            callback(null);
        });
    });
}

function processTheme(view, model, req, res, next) {
    model.__user__ = req.user;
    model.__request__ = {
        host: req.host
    };
    appendSettings(model, function(err) {
        if (err) {
            return next(err);
        }
        return res.render(res.themePath + view, model);
    });
}

exports = module.exports = {

    'GET /': function(req, res, next) {
        //
    },

    'GET /category/:id': function(req, res, next) {
        //
    },

    'GET /article/:id': function(req, res, next) {
        var model = {};
        async.waterfall([
            function(callback) {
                articleApi.getArticle(req.params.id, callback);
            },
            function(article, callback) {
                model.article = article;
                categoryApi.getCategory(article.category_id, callback);
            },
            function(category, callback) {
                model.category = category;
                commentApi.getComments(model.article.id, callback);
            }
        ], function(err, comments) {
            if (err) {
                return next(err);
            }
            model.comments = comments;
            return processTheme('article/article.html', model, req, res, next);
        });
    },

    'GET /wiki/:id': function(req, res, next) {
        //
    },

    'GET /wiki/:wid/:pid': function(req, res, next) {
        //
    },
};
