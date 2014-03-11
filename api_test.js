// api test fixture:

var
    _ = require('underscore'),
    request = require('request'),
    querystring = require('querystring');

var options = {
    url: 'http://localhost:3000',
    email: 'test@email.com',
    passwd: 'test'
};

function build_url(path, params) {
    var url = options.url + path;
    if (params) {
        url = url + '?' + querystring.stringify(params);
    }
    return url;
}

function build_headers() {
    return {
        'Authorization': 'Basic ' + new Buffer(options.email + ':' + options.passwd).toString('base64'),
        'X-Custom-Header': 'Test'
    };
}

exports = module.exports = {

    setup: function(url, email, passwd) {
        options.url = url;
        options.email = email;
        options.passwd = passwd;
    };

    get: function(path, params, fn) {
        var opt = {
            method: 'GET',
            url: build_url(path, params),
            headers: build_headers()
        };
        request(opt, function(err, resp, body) {
            //
        });
    }
};
