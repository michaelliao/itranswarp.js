// default config files: config_default.js

// make a copy to 'config_override.js' and override some of the settings you needed:

module.exports = {
    'session': {
        'salt': 'iTranswarp.js',
    },
    'db': {
        'host': 'localhost',
        'port': 3306,
        'schema': 'itranswarp',
        'user': 'www',
        'password': 'www',
        'maxConnections': 10,
        'maxIdleTime': 30
    },
    'oauth': {
        'sinaweibo': {
            'app_key': '?',
            'app_secret': '?'
        }
    }
}
