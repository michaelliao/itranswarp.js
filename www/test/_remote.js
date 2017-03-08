'use strict';

// api test fixture which expose the following functions:
// 
// await sql(sql, params) - execute sql with parameters.
// await get(role, path, params)
// await post(role, path, params)
// await download(path, params)

var config = require('../config');

var
    _ = require('lodash'),
    co = require('co'),
    fs = require('fs'),
    util = require('util'),
    thunkify = require('thunkify'),
    db = require('../db'),
    should = require('should'),
    crypto = require('crypto'),
    request = require('request'),
    querystring = require('querystring'),
    constants = require('../constants');

var
    warp = db.warp,
    next_id = db.next_id;

var base_url = 'http://local.itranswarp.com:2015';

var options = {
    url: base_url
};

// init emails of users:

var emails = {};

_.each(constants.role, function (role, roleName) {
    if (role !== constants.role.GUEST) {
        emails['' + role] = roleName.toLowerCase() + '@itranswarp.com';
    }
});

function _buildUrl(method, path, params) {
    var url = options.url + path;
    if (method === 'GET' && params) {
        url = url + '?' + querystring.stringify(params);
    }
    return url;
}

function generatePassword(email) {
    return crypto.createHash('sha1').update(email + ':password').digest('hex');
}

function _buildHeaders(method, role) {
    var
        email = null,
        passwd = null,
        headers = {
            'X-Custom-Header': 'Test'
        };
    if (typeof(role) === 'number' && (role >= 0)) {
        email = emails['' + role];
        passwd = generatePassword(email);
        headers['Authorization'] = 'Basic ' + new Buffer(email + ':' + passwd).toString('base64');
        console.log('    Authorization: ' + headers.Authorization);
    }
    if (method === 'POST') {
        headers['Content-Type'] = 'application/json';
    }
    if (method === 'UPLOAD') {
        headers['Content-Type'] = 'application/octet-stream';
    }
    return headers;
}

function http(method, role, path, params, callback) {
    var
        curl,
        opt = {
            method: method==='UPLOAD' ? 'POST' : method,
            headers: _buildHeaders(method, role),
            url: _buildUrl(method, path, params),
            followRedirect: false
        },
        r;
    params = params || {};
    if (method === 'POST') {
        opt.body = JSON.stringify(params);
        console.log('POST DATA: ' + JSON.stringify(params, function (key, value) {
            if (key === 'image') {
                return value.substring(0, 20) + ' (' + value.length + ' bytes image data) ...';
            }
            return value;
        }));
    }
    if (method === 'UPLOAD') {
        opt.body = fs.readFileSync(params); // params should be file name
    }
    console.log('>>> request: ' + opt.method + ' ' + opt.url);
    r = request(opt, function (err, res, body) {
        should(err).not.be.ok;
        res.should.have.status(200);
        console.log('>>> response got: ' + res.statusCode);
        console.log(body);
        var json = JSON.parse(body);
        should(json).be.ok;
        console.log('>>> http done.');
        return callback(null, json);
    });
    console.log('>>> request sent.');
    // build curl:
    curl = 'curl -v';
    _.each(opt.headers, function (v, k) {
        curl = curl + ' -H \"' + k + ': ' + v + '\"';
    });
    if (method==='UPLOAD') {
        curl = curl + ' --form file=@' + params;
    }
    if (method === 'POST' && params) {
        curl = curl + ' -d \'' + JSON.stringify(params, function (key, value) {
            if (key === 'image') {
                return value.substring(0, 20) + ' (' + value.length + ' bytes image data) ...';
            }
            return value;
        }) + '\'';
    }
    curl = curl + ' ' + opt.url;
    console.log('>>> replay command with curl:');
    console.log('--------------------------------------------------------------------------------');
    console.log(curl);
    console.log('--------------------------------------------------------------------------------');
    console.log('// if you want to replay this http request,');
    console.log('// you can run this command.');
}

var $http = thunkify(http);

var init_sqls = [];

_.each(db, function (model, k) {
    if (model.__table) {
        init_sqls.push('delete from ' + model.__table);
    }
});

_.each(emails, function (email, roleId) {
    var
        id = next_id(),
        lid = next_id(),
        name = email.substring(0, email.indexOf('@')),
        passwd = crypto.createHash('sha1').update(lid + ':' + generatePassword(email)).digest('hex'),
        now = Date.now();
    init_sqls.push(util.format('insert into localusers (id, user_id, passwd) values (\'%s\', \'%s\', \'%s\')', lid, id, passwd));
    init_sqls.push(
        util.format(
            'insert into users (id,     role,   name,   email,  verified, locked_until, image_url, created_at, updated_at, version) values (' +
                               '\'%s\', %s,     \'%s\', \'%s\', %d,       %d,           \'%s\',    %d,         %d,         %d)',
                               id,      roleId, name,   email,  1,        0,            '/t.png',  now,        now,        0));
});

function* $initDatabase() {
    console.log('setup: init database first...');
    var i, sql;
    for (i=0; i<init_sqls.length; i++) {
        sql = init_sqls[i];
        console.log('>>> SQL: ' + sql);
        yield warp.$query(sql);
    }
}

function* $get(role, path, params) {
    return await http('GET', role, path, params);
}

function* $post(role, path, params) {
    return await http('POST', role, path, params);
}

function* $upload(role, path, params) {
    return await http('UPLOAD', role, path, params);
}

function download(path, callback) {
    var
        url = options.url + path,
        opt = {
            method: 'GET',
            url: url,
            followRedirect: false
        };
    console.log('>>> request: GET ' + url);
    request(opt, function (err, res, body) {
        should(err).not.be.ok;
        console.log('>>> response: ' + res.statusCode);
        _.each(res.headers, function (value, key) {
            console.log('    ' + key + ': ' + value);
        });
        return callback(null, {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
        });
    });
}

module.exports = {

    next_id: next_id,

    base_url: base_url,

    init: function (url, email, passwd) {
        options.url = url;
        options.email = email;
        options.passwd = passwd;
    },

    setup: function (done) {
        co(function* () {
            await initDatabase();
        }).then(function (result) {
            done();
        }, function (err) {
            done(err);
        });
    },

    generatePassword: generatePassword,

    $get: $get,

    $post: $post,

    $upload: $upload,

    $sleep: thunkify(function (ms, callback) {
        setTimeout(function () {
            callback(null, 'done');
        }, ms);
    }),

    readFileSync: function (filename) {
        return fs.readFileSync(__dirname + '/' + filename);
    },

    shouldNoError: function (r) {
        should(r).be.ok;
        should(r.error).not.be.ok;
    },

    shouldHasError: function (r, error, data) {
        should(r).be.ok;
        should(r.error).be.ok;
        if (error!==undefined) {
            r.error.should.equal(error);
        }
        if (data!==undefined) {
            should(r.data).be.ok;
            r.data.should.equal(data);
        }
    },

    $download: thunkify(download),

    warp: warp

};
