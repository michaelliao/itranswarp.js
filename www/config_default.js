'use strict';

/*
 * This is the default configuration for iTranswarp.js.
 * 
 * DO NOT change it. Instead, make a copy and rename to: config_<NODE_ENV>.js
 * 
 * For development, the target file is config_development.js.
 * 
 * Then edit settings you needed.
 */
module.exports = {
    // server domain name:
    domain: 'local.itranswarp.com',
    // the theme used, default to 'default':
    theme: 'default',
    session: {
        // http session cookie name:
        cookie: 'isession',
        // used to generate secure session cookie, can be set to any random string:
        salt: 'itranswarp.js',
        // signin expires in N seconds:
        expires: 7 * 24 * 3600,
        // node is behind a https reverse proxy?
        https: false
    },
    db: {
        // mysql host or ip address:
        host: 'localhost',
        // mysql port (default to 3306):
        port: 3306,
        // mysql username:
        username: 'root',
        // mysql password:
        password: 'password',
        // database name:
        database: 'itranswarp',
        // log sql:
        showSql: false,
        // pool settings:
        maxConnections: 20,
        minConnections: 1,
        maxIdleTime: 60000 // idle time = 60s
    },
    cache: {
        // cache key prefix:
        prefix: 'itw/',
        // memcached host or ip address:
        host: '127.0.0.1',
        // memcached port, default to 11211:
        port: 11211,
        // connection timeout, default to 1 second:
        timeout: 1000,
        // retries when failed:
        retries: 3
    },
    // cdn url prefix, e.g. 'http://cdn.example.com'
    cdn: {
        url_prefix: ''
    },
    // NOT USED NOW:
    queue: {
        // host or ip address of redis:
        host: '127.0.0.1',
        // port of redis, default to 6379:
        port: 6379
    },
    // NOT USED NOW:
    search: {
        provider: 'site_search',
        configs: {
            // default set to google search:
            search_url: 'https://www.google.com/search?ie=utf-8&q=%s',
            // other search engines:
            // baidu: 'http://www.baidu.com/s?ie=utf-8&wd=%s'
            // bing: 'http://www.bing.com/search?ie=utf-8&q=%s'
        }
    },
    // oauth2 providers that allow sign in from other oauth2 providers:
    oauth2: {
        // e.g. facebook oauth2 configuration:
        // 'faceook': {
        //     'icon': 'facebook',
        //     'name': 'Sign in with Facebook',
        //     'app_key': 'your-app-id',
        //     'app_secret': 'your-app-secret',
        // }
    }
};
