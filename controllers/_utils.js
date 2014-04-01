// utils for common functions.

var
    _ = require('lodash'),
    async = require('async'),
    crypto = require('crypto'),
    config = require('../config'),
    api = require('../api'),
    db = require('../db');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function Page(pageIndex, itemsPerPage) {
    this.pageIndex = pageIndex ? pageIndex : 1;
    this.itemsPerPage = itemsPerPage ? itemsPerPage : 20;
    this.__totalItems = 0;

    this.__defineGetter__('totalItems', function() {
        return this.__totalItems;
    });

    this.__defineSetter__('totalItems', function(val) {
        this.__totalItems = val;
    });

    this.__defineGetter__('totalPages', function() {
        var total = this.__totalItems;
        if (total===0) {
            return 0;
        }
        return Math.floor(total / this.itemsPerPage) + (total % this.itemsPerPage===0 ? 0 : 1);
    });

    this.__defineGetter__('isEmpty', function() {
        return this.__totalItems===0;
    });

    this.__defineGetter__('offset', function() {
        return this.itemsPerPage * (this.pageIndex - 1);
    });

    this.__defineGetter__('limit', function() {
        return this.itemsPerPage;
    });

    this.toJSON = function() {
        return {
            index: this.pageIndex,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            totalPages: this.totalPages
        };
    }
}

var SESSION_COOKIE_NAME = 'itranswarpsession';
var salt = config.session.salt;

// for safe base64 replacements:
var
    re_add = new RegExp(/\+/g),
    re_sla = new RegExp(/\//g),
    re_equ = new RegExp(/\=/g);

var
    re_r_add = new RegExp(/\-/g),
    re_r_sla = new RegExp(/\_/g),
    re_r_equ = new RegExp(/\./g);

// string -> base64:
function safe_b64encode(s) {
    var b64 = new Buffer(s).toString('base64');
    return b64.replace(re_add, '-').replace(re_sla, '_').replace(re_equ, '.');
}

// base64 -> string
function safe_b64decode(s) {
    var b64 = s.replace(re_r_add, '+').replace(re_r_sla, '/').replace(re_r_equ, '=');
    return new Buffer(b64, 'base64').toString();
}

// Generate a secure client session cookie by constructing string:
// base64(provider:uid:expires:md5(uid:expires:passwd:salt)).
function makeSessionCookie(provider, uid, passwd, expires) {
    var now = Date.now();
    var min = now + 86400000; // 1 day
    var max = now + 2592000000; // 30 days
    if (! expires) {
        expires = now + 604800000; // default to 7 days;
    }
    else if (expires < min) {
        expires = min;
    }
    else if (expires > max) {
        expires = max;
    }
    var secure = [provider, uid, passwd, salt].join(':');
    var md5 = crypto.createHash('md5').update(secure).digest('hex');
    return safe_b64encode([provider, uid, expires, md5].join(':'));
}

// middle ware for bind user from session cookie or authorization header:
function userIdentityParser(req, res, next) {
    req.user = null;
    var cookie = req.cookies[SESSION_COOKIE_NAME];
    if (cookie) {
        return parseSessionCookie(cookie, function(err, user) {
            if (err) {
                return next(err);
            }
            if (user) {
                user.passwd = '******';
                req.user = user;
                console.log('bind user from session cookie: ' + user.email);
            }
            else {
                console.log('invalid session cookie. cleared.');
                res.clearCookie(SESSION_COOKIE_NAME, {path: '/'});
            }
            return next();
        });
    }
    console.log('no session cookie found.');
    var auth = req.get('authorization');
    if (auth) {
        return parseAuthorization(auth, function(err, user) {
            if (err) {
                return next(err);
            }
            if (user) {
                user.passwd = '******'
                req.user = user;
                console.log('bind user from authorization: ' + user.email);
            }
            else {
                console.log('invalid authorization header.');
            }
            return next();
        });
    }
    return next();
}

// parseSessionCookie, with callback(err, user):
function parseSessionCookie(s, fn) {
    var ss = safe_b64decode(s).split(':');
    if (ss.length != 4) {
        return fn(null, null);
    }
    var
        provider = ss[0],
        uid = ss[1],
        expires = parseInt(ss[2]),
        md5 = ss[3];
    if (isNaN(expires) || expires < Date.now()) {
        return fn(null, null);
    }
    if (!uid || !provider || !md5) {
        return fn(null, null);
    }
    User.find(uid, function(err, user) {
        if (err) {
            return fn(err);
        }
        if (! user) {
            return fn(null, null);
        }
        var secure = [provider, uid, user.passwd, salt].join(':');
        var expected = crypto.createHash('md5').update(secure).digest('hex');
        fn(null, md5===expected ? user : null);
    });
}

// parse header 'Authorization: Basic xxxx',
// with callback(err, user):
function parseAuthorization(auth, fn) {
    console.log('try parse header: Authorization: ' + auth);
    if ((auth.length < 6) || (auth.substring(0, 6)!=='Basic ')) {
        return fn(null, null);
    }
    var up = new Buffer(auth.substring(6), 'base64').toString().split(':');
    if (up.length!=2) {
        return fn(null, null);
    }
    var u = up[0], p = up[1];
    console.log('try validate: ' + u + ', ' + p)
    if (!u || !p) {
        return fn(null, null);
    }
    User.find({ where: 'email=?', params: [u] }, function(err, user) {
        if (err) {
            return fn(err);
        }
        if (user && user.passwd===p) {
            console.log('binded user: ' + user.email);
            return fn(null, user);
        }
        console.log('invalid authorization header.');
        return fn(null, null);
    });
}

function isForbidden(req, role) {
    return req.user===null || req.user.role > role;
}

// ' A, B ; Ccc, ccc ' -> 'A,B,Ccc'
function formatTags(tags) {
    var arr = _.map(tags.split(/[\,\;]/), function(value) {
        return value.trim();
    });
    var dict = {};
    return _.filter(arr, function(value) {
        if (value) {
            var lv = value.toLowerCase();
            if (lv in dict) {
                return false;
            }
            dict[lv] = true;
            return true;
        }
        return false;
    }).join(',');
}

// return trimed parameter value as string, or default value if not exist. defaultValue is default to null.
function getParam(name, defaultValue, req) {
    if (arguments.length===2) {
        req = defaultValue;
        defaultValue = null;
    }
    var s = defaultValue;
    if (name in req.body) {
        s = req.body[name].trim();
    }
    return s ? s : defaultValue;
}

// return trimed parameter value as string, if not exist or empty, throw APIError('param:invalid').
function getRequiredParam(name, req) {
    var s = null;
    if (name in req.body) {
        s = req.body[name].trim();
    }
    if (s) {
        return s;
    }
    throw api.invalid_param(name);
}

exports = module.exports = {

    formatTags: formatTags,

    makeSessionCookie: makeSessionCookie,

    userIdentityParser: userIdentityParser,

    isForbidden: isForbidden,

    getParam: getParam,

    getRequiredParam: getRequiredParam,

    getPage: function(req, itemsPerPage) {
        var index = parseInt(req.query.page);
        return new Page(isNaN(index) ? 1 : index, itemsPerPage);
    },

    page: function(pageIndex, itemsPerPage) {
        return new Page(pageIndex, itemsPerPage);
    },

    SESSION_COOKIE_NAME: SESSION_COOKIE_NAME
}
