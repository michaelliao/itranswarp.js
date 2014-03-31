// api test fixture which expose the following functions:
//
// sql(sql, params, fn) - execute sql with parameters, and callback.
// get(path, params, fn)
// post(path, params, fn)
// upload(path, params, fn)

var fs = require('fs');

var
    _ = require('lodash'),
    async = require('async'),
    should = require('should'),
    request = require('request'),
    querystring = require('querystring'),
    constants = require('../constants');

var warp = require('../db').warp;

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

function build_headers(role) {
    var email = null;
    var passwd = null;
    if (role==constants.ROLE_ADMIN) {
        email = options.email;
        passwd = options.passwd;
    }
    else if (role==constants.ROLE_EDITOR) {
        email = 'editor@itranswarp.com';
        passwd = 'ee001122334455667788990000000eee';
    }
    else if (role==constants.ROLE_CONTRIBUTOR) {
        email = 'contrib@itranswarp.com';
        passwd = 'dd001122334455667788990000000ddd';
    }
    else if (role==constants.ROLE_SUBSCRIBER) {
        email = 'subs@itranswarp.com';
        passwd = 'ff001122334455667788990000000fff';
    }
    var headers = {
        'X-Custom-Header': 'Test'
    };
    if (email && passwd) {
        headers['Authorization'] = 'Basic ' + new Buffer(email + ':' + passwd).toString('base64');
        console.log('    Authorization: ' + headers['Authorization']);
    }
    return headers;
}

function build_form(params) {
    return params ? params : {};
}

function http(role, method, path, params, fn) {
    var opt = {
        method: method,
        headers: build_headers(role),
        url: method==='GET' ? build_url(path, params) : build_url(path)
    };
    var r = request(opt, function(err, res, body) {
        should(err).not.be.ok;
        res.should.have.status(200);
        console.log('>>> response got: ' + res.statusCode);
        console.log(body);
        var json = JSON.parse(body);
        should(json).be.ok;
        return fn(json);
    });
    params = params || {};
    if (method!=='GET') {
        opt.form = r.form();
        _.each(params, function(value, key) {
            opt.form.append(key, value);
        });
    }
    console.log('>>> request: ' + method + ' ' + opt.url);
    if (opt.form) {
        if (opt.form.file) {
            console.log('>>> form: multipart/form-data');
        }
        else {
            console.log('>>> form: ' + querystring.stringify(params));
        }
    }
    console.log('>>> request sent.');
}

var init_sqls = [
    'delete from pages',
    'delete from articles',
    'delete from categories',
    'delete from users',
    'delete from attachments',
    'delete from resources',
    'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'001390000000000ffffffffff0ffffffffff0ffffffffff000\', ' + constants.ROLE_ADMIN + ',       \'Admin\',      \'admin@itranswarp.com\',   \'e8f98b1676572cd24c753c331aa6b02e\', 1, \'http://about:blank\', 0,             1394542829892, 1394542829892, 0)',
    'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'001390000000000aaaaaaaaaa0bbbbbbbbbb0cccccccccc000\', ' + constants.ROLE_ADMIN + ',       \'Special\',    \'nopass@itranswarp.com\',  \'\',                                 1, \'http://about:blank\', 0,             1396908390840, 1396908390840, 0)',
    'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'001390000000000eeeeeeeeee0eeeeeeeeee0eeeeeeeeee000\', ' + constants.ROLE_ADMIN + ',       \'Locked\',     \'lock@itranswarp.com\',    \'ff000111222333444555666777888999\', 1, \'http://about:blank\', 2000999999000, 1396907970807, 1396907970807, 0)',
    'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'00139000000000044444444440aaaaaaaaaa0bbbbbbbbbb000\', ' + constants.ROLE_EDITOR + ',      \'Editor\',     \'editor@itranswarp.com\',  \'ee001122334455667788990000000eee\', 1, \'http://about:blank\', 0,             1394510182911, 1394510182911, 0)',
    'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'0013900000000009999999999f66666666660ffffffffff000\', ' + constants.ROLE_CONTRIBUTOR + ', \'Contrib\',    \'contrib@itranswarp.com\', \'dd001122334455667788990000000ddd\', 1, \'http://about:blank\', 0,             1394542892829, 1394542892829, 0)',
    'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'001390000000000ffffffffff0eeeeeeeeee02222222222000\', ' + constants.ROLE_SUBSCRIBER + ',  \'Subscriber\', \'subs@itranswarp.com\',    \'ff001122334455667788990000000fff\', 1, \'http://about:blank\', 0,             1394542800090, 1394542800090, 0)',
    'select * from users'
];

function init_db(done) {
    console.log('setup: init database first...');
    async.series(_.map(init_sqls, function(s) {
        return function(callback) {
            warp.query(s, callback);
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

    get: function(role, path, params, fn) {
        http(role, 'GET', path, params, fn);
    },

    post: function(role, path, params, fn) {
        http(role, 'POST', path, params, fn);
    },

    download: function(path, fn) {
        var url = build_url(path);
        console.log('>>> request: GET ' + url);
        request(url, function(err, res, body) {
            should(err).not.be.ok;
            res.should.have.status(200);
            console.log('>>> response: ' + res.statusCode);
            _.each(res.headers, function(value, key) {
                console.log('    ' + key + ': ' + value);
            });
            return fn(res.headers['content-type'], parseInt(res.headers['content-length']), body);
        });
    },

    createReadStream: function(path) {
        return fs.createReadStream(path);
    },

    admin: constants.ROLE_ADMIN,
    editor: constants.ROLE_EDITOR,
    contributor: constants.ROLE_CONTRIBUTOR,
    subscriber: constants.ROLE_SUBSCRIBER,
    guest: constants.ROLE_GUEST,

    sql: warp.query
};
