/*
 * This is the default configuration for iTranswarp.js.
 * 
 * DO NOT change it. Instead, make a copy and put to:
 * "/srv/itranswarp/config/override.js"
 * 
 * Then edit settings you needed.
 */
module.exports = {
    // server domain name:
    domain: 'www.example.com',
    // the theme used, default to 'default':
    theme: 'default',
    session: {
        cookie: 'isession',
        // used to generate secure session cookie, can be set to any random string:
        salt: 'itranswarp.js',
        // signin expires in N seconds:
        expires: 7 * 24 * 3600,
        // use https for management:
        httpsForManagement: false
    },
    db: {
        host: 'localhost', // mysql host or ip address
        port: 3306, // mysql port (default to 3306)
        username: 'www', // username to login to mysql
        password: 'www', // password to login to mysql
        database: 'itranswarp', // database name
        // pool settings:
        maxConnections: 20, // max = 20
        minConnections: 1, // min = 1
        maxIdleTime: 60000 // idle time = 60s
    },
    // NOT USED NOW:
    cdn: {
        static_prefix: ''
    },
    cache: {
        prefix: 'it/',
        // host or ip address of memcached:
        host: '127.0.0.1',
        // port of memcached, default to 11211:
        port: 11211,
        // connection timeout, default to 1 second:
        timeout: 1000,
        // retries when failed:
        retries: 3
    },
    log: {
        dir: '/tmp/'
    },
    // NOT USED NOW:
    queue: {
        // host or ip address of redis:
        host: '127.0.0.1',
        // port of redis, default to 6379:
        port: 6379
    },
    search: {
        provider: 'site_search',
        configs: {
            // default set to google search:
            search_url: 'https://www.google.com/search?ie=utf-8&q=%s',
            // other search engines:
            // baidu: 'http://www.baidu.com/s?ie=utf-8&wd=%s'
            // bing: 'http://www.bing.com/search?ie=utf-8&q=%s'
            domain: 'www.example.com'
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
        //     'redirect_uri': 'http://your-redirect-uri/config/in/facebook'
        // }
    }
};
