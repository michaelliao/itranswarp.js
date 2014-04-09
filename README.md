itranswarp.js
=============

A nodejs powered website containing blog, wiki, discuss.

### configurations

You should make a copy of 'config_default.json' to 'config_override.json', and override some of the settings you needed.

Please NOTE all the comments MUST be removed in json file to make sure the json is valid:

    // config_override.json
    {
        "session": {
            // the salt used to generate session cookie, you can change to a random string:
            "salt": "iTranswarp.js"
        },
        // database configs:
        "db": {
            // database host or IP address:
            "host": "localhost",
            // default port is 3306:
            "port": 3306,
            // database user:
            "user": "www",
            // database password:
            "password": "www",
            // database schema name:
            "database": "itranswarp",
            // maximum connections:
            "connectionLimit": 20
        },
        // config oauth2 providers:
        "oauth2": {
            // e.g. using facebook oauth2 signin:
            "facebook": {
                "app_key": "<your-facebook-app-id>",
                "app_secret": "<your-facebook-app-secret>",
                "redirect_uri": "http://www.your-domain.com/auth/callback/facebook"
            }
        }
    }
