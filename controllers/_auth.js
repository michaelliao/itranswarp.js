// oauth providers:

var _ = require('lodash');

var oauth2 = require('oauth2-warp');

var config = require('../config');

var names = ['weibo'];

var providers = {};

_.each(names, function(name) {
    var cfg = config.oauth2[name];
    providers[name] = oauth2.createProvider(
        name,
        cfg.app_key,
        cfg.app_secret,
        cfg.redirect_uri
    );
});

exports = module.exports = providers;
