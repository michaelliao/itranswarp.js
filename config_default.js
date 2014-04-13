/*
 * This is the default configuration for iTranswarp.js.
 * 
 * DO NOT change it. Instead, make a copy and name to "config_override.js",
 * then edit the settings.
 */
exports = module.exports = {
    'session': {
        // used to generate secure session cookie, can be set to any random string:
        'salt': 'iTranswarp.js'
    },
    'db': {
        // host or ip address of mysql, e.g. '192.168.1.123':
        'host': 'localhost',
        // port of mysql, default to 3306:
        'port': 3306,
        // user to login to mysql, change to your mysql user:
        'user': 'www',
        // password to login to mysql, change to your mysql password:
        'password': 'www',
        // database used in mysql, default to 'itranswarp':
        'database': 'itranswarp',
        // timeout before initial a connection to mysql, default to 3 seconds:
        'connectTimeout': 3000,
        // maximum concurrent db connections:
        'connectionLimit': 20
    },
    // server domain name:
    'domain': 'www.example.com',
    // the theme used, default to 'default':
    'theme': 'default',
    // oauth2 providers that allow sign in from other oauth2 providers:
    'oauth2': {
        // e.g. facebook oauth2 configuration:
        // 'faceook': {
        //     'app_key': 'your-app-id',
        //     'app_secret': 'your-app-secret',
        //     'redirect_uri': 'http://your-redirect-uri/config/in/facebook'
        // }
    }
}
