// api test fixture:

var
    _ = require('underscore'),
    assert = require('assert'),
    request = require('request'),
    querystring = require('querystring');

var options = {
    url: 'http://localhost:3000',
    email: 'admin@itranswarp.com',
    passwd: 'e8f98b1676572cd24c753c331aa6b02e'
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

function build_form(params) {
    return params ? params : {};
}

exports = module.exports = {

    setup: function(url, email, passwd) {
        options.url = url;
        options.email = email;
        options.passwd = passwd;
    },

    get: function(path, params, fn) {
        var opt = {
            method: 'GET',
            url: build_url(path, params),
            headers: build_headers()
        };
        request(opt, function(err, res, body) {
            console.log('>>> request: GET ' + opt.url);
            console.log('>>> response: ' + res.statusCode + '\n' + body);
            assert.isNull(err, 'An error occurred!');
            assert.equal(res.statusCode, 200, 'Bad response code: ' + res.statusCode);
            return fn(JSON.parse(body));
        });
    },

    post: function(path, params, fn) {
        var opt = {
            method: 'POST',
            url: build_url(path),
            headers: build_headers(),
            form: build_form(params)
        };
        request(opt, function(err, res, body) {
            console.log('>>> request: POST ' + opt.url);
            console.log('>>> form:');
            console.log(querystring.stringify(opt.form));
            console.log('>>> response: ' + res.statusCode + '\n' + body);
            assert.isNull(err, 'An error occurred!');
            assert.equal(res.statusCode, 200, 'Bad response code: ' + res.statusCode);
            return fn(JSON.parse(body));
        });
    }

};
