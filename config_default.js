// default config files: config_default.js

// make a copy to 'config_override.js' and override some of the settings you needed:

module.exports = {
    'session': {
        'salt': 'iTranswarp.js',
    },
    'db': {
        'host': 'localhost',
        'port': 3306,
        'user': 'www',
        'password': 'www',
        'database': 'itranswarp',
        'connectionLimit': 20
    },
    'oauth': {
        'provider_name': {
            'app_key': '?',
            'app_secret': '?'
        }
    }
}
