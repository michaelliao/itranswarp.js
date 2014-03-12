// api test fixture which expose the following functions:
//
// sql(sql, params, fn) - execute sql with parameters, and callback.
// get(path, params, fn)
// post(path, params, fn)
// upload(path, params, fn)

var
    _ = require('lodash'),
    async = require('async'),
    assert = require('assert'),
    request = require('request'),
    querystring = require('querystring');

var sequelize = require('../db').sequelize;

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

function sql(sql, params, fn) {
    sequelize.query(sql, null, { raw: true }, params || []).error(function(err) {
        throw err;
    }).success(function(r) {
        fn(r);
    });
}

var init_sqls = [
    'delete from t_category',
    'delete from t_user',
    'insert into t_user (id, role, name, email, passwd, verified, binds, image_url, locked_util, created_at, updated_at, version) values (\'001390000000000ffffffffff0ffffffffff0ffffffffff000\', 0, \'Admin\', \'admin@itranswarp.com\', \'e8f98b1676572cd24c753c331aa6b02e\', 1, \'\', \'http://about:blank\', 0, 1394542829892, 1394542829892, 0)',
    'insert into t_user (id, role, name, email, passwd, verified, binds, image_url, locked_util, created_at, updated_at, version) values (\'001390000000000aaaaaaaaaa0bbbbbbbbbb0cccccccccc000\', 0, \'Special\', \'nopass@itranswarp.com\', \'\', 1, \'\', \'http://about:blank\', 0, 1396908390840, 1396908390840, 0)',
    'insert into t_user (id, role, name, email, passwd, verified, binds, image_url, locked_util, created_at, updated_at, version) values (\'001390000000000eeeeeeeeee0eeeeeeeeee0eeeeeeeeee000\', 0, \'Locked\', \'lock@itranswarp.com\', \'ff000111222333444555666777888999\', 1, \'\', \'http://about:blank\', 2000999999000, 1396908390840, 1396908390840, 0)',
    'select * from t_user'
];

var is_db_init = false;

function init_db(done) {
    console.log('setup: init database first...');
    async.series(_.map(init_sqls, function(s) {
        return function(callback) {
            sql(s, null, function() {
                callback(null, true);
            });
        };
    }), function(err, results) {
        return err ? done(err) : done();
    });
}

exports = module.exports = {

    init: function(url, email, passwd) {
        options.url = url;
        options.email = email;
        options.passwd = passwd;
    },

    setup: function(done) {
        async.series([
            function(callback) {
                if (is_db_init) {
                    return callback(null, true);
                }
                is_db_init = true;
                init_db(function(err) {
                    callback(err, true);
                });
            },
            function(callback) {
                //
                callback(null, true);
            }
        ], function(err, results) {
            done(err);
        });
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
            assert.ok(err===null, 'An error occurred!');
            assert.ok(res.statusCode==200, 'Bad response code: ' + res.statusCode);
            var r = JSON.parse(body);
            assert.ok(r!=null, 'json result is null.');
            return fn(r);
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
            assert.ok(err===null, 'An error occurred!');
            assert.ok(res.statusCode==200, 'Bad response code: ' + res.statusCode);
            var r = JSON.parse(body);
            assert.ok(r!=null, 'json result is null.');
            return fn(r);
        });
    },

    sql: sql
};
