// oauth providers:

var
    _ = require('lodash'),
    oauth2 = require('oauth2-warp');

var config = require('../config');

var names = ['weibo'];

var providers = {};

_.each(config.oauth2, function(cfg, name) {
    providers[name] = oauth2.createProvider(
        name,
        cfg.app_key,
        cfg.app_secret,
        cfg.redirect_uri
    );
    console.log('Init OAuth2: ' + name);
});

exports = module.exports = providers;
