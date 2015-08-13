'use strict';

/**
 * Authenticate users.
 * 
 * How to generate password:
 * 
 * user's email: user@example.com
 * user's password: HelloWorld
 * send hashed password for authentication:
 *   {
 *     email: 'user@example.com',
 *     passwd: 'fa54b4176373caef36be50474880541de1894428' // => sha1('user@example.com' + ':' + 'HelloWorld')
 *   }
 * verify in db:
 * db_password = loadFromDatabase(); // => 'f901cedb0cfbd27bfdb69d8b66e1f49a9fe0d0fe'
 * authenticated = db_password === sha1(user_id + ':' + 'fa54b4176373caef36be50474880541de1894428')
 * 
 * that means, there are 2 sha1-hash for user's original password, and the salt is user's email and id.
 */

var
    crypto = require('crypto'),
    config = require('./config'),
    api = require('./api'),
    db = require('./db'),
    constants = require('./constants');

var
    User = db.user,
    LocalUser = db.localuser,
    AuthUser = db.authuser;

var
    COOKIE_NAME = config.session.cookie,
    COOKIE_SALT = config.session.salt,
    COOKIE_EXPIRES_IN_MS = config.session.expires * 1000;

// for safe base64 replacements:
var
    re_add = new RegExp(/\+/g),
    re_sla = new RegExp(/\//g),
    re_equ = new RegExp(/\=/g),
    re_r_add = new RegExp(/\-/g),
    re_r_sla = new RegExp(/\_/g),
    re_r_equ = new RegExp(/\./g);

function _generatePassword(salt, inputPassword) {
    return crypto.createHash('sha1').update(salt + ':' + inputPassword).digest('hex');
}

function _verifyPassword(salt, inputPassword, expectedPassword) {
    return expectedPassword === crypto.createHash('sha1').update(salt + ':' + inputPassword).digest('hex');
}

// string -> base64:
function _safe_b64encode(s) {
    var b64 = new Buffer(s).toString('base64');
    return b64.replace(re_add, '-').replace(re_sla, '_').replace(re_equ, '.');
}

// base64 -> string
function _safe_b64decode(s) {
    var b64 = s.replace(re_r_add, '+').replace(re_r_sla, '/').replace(re_r_equ, '=');
    return new Buffer(b64, 'base64').toString();
}

// Generate a secure client session cookie by constructing string:
// base64(provider:id:expires:sha1(provider:id:expires:passwd:salt)).
function makeSessionCookie(provider, theId, passwd, expires) {
    var
        now = Date.now(),
        min = now + 86400000, // 1 day
        max = now + 2592000000, // 30 days
        secure, sha1, str;
    if (!expires) {
        expires = now + COOKIE_EXPIRES_IN_MS;
    } else if (expires < min) {
        expires = min;
    } else if (expires > max) {
        expires = max;
    }
    secure = [provider, theId, String(expires), passwd, COOKIE_SALT].join(':');
    sha1 = crypto.createHash('sha1').update(secure).digest('hex');
    str = [provider, theId, expires, sha1].join(':');
    console.log('make session cookie: ' + str);
    console.log('session cookie expires at ' + new Date(expires).toLocaleString());
    console.log('>>> secure: ' + secure);
    console.log('>>> sha1: ' + sha1);
    return _safe_b64encode(str);
}

function* $findUserAuthByProvider(provider, id) {
    var au, lu, user, passwd;
    if (provider === constants.signin.LOCAL) {
        lu = yield LocalUser.$find(id);
        if (lu === null) {
            return null;
        }
        passwd = lu.passwd;
        user = yield User.$find(lu.user_id);
    }
    else {
        au = yield AuthUser.$find(id);
        if (au === null) {
            return null;
        }
        passwd = au.auth_token;
        user = yield User.$find(au.user_id);
    }
    return {
        user: user,
        passwd: passwd
    };
}

// parse header 'Authorization: Basic xxxx'
function* $parseAuthorization(auth) {
    console.log('try parse header: Authorization: ' + auth);
    if ((auth.length < 6) || (auth.substring(0, 6) !== 'Basic ')) {
        return null;
    }
    var
        u, p, user, luser,
        up = new Buffer(auth.substring(6), 'base64').toString().split(':');
    if (up.length !== 2) {
        return null;
    }
    u = up[0];
    p = up[1];
    if (!u || !p) {
        return null;
    }
    // TODO: check sha1 regex?
    user = yield User.$find({
        where: 'email=?',
        params: [u]
    });
    if (user) {
        luser = yield LocalUser.$find({
            where: 'user_id=?',
            params: [user.id]
        });
        if (luser && _verifyPassword(luser.id, p, luser.passwd)) {
            console.log('binded user: ' + user.name);
            return user;
        }
    }
    console.log('invalid authorization header.');
    return null;
}

// parseSessionCookie:
// provider:uid:expires:sha1(provider:uid:expires:passwd:salt)
function* $parseSessionCookie(s) {
    var
        ss = _safe_b64decode(s).split(':'),
        user,
        auth,
        theId, provider, expiresStr, expires, sha1, secure, expected;
    if (ss.length !== 4) {
        return null;
    }
    provider = ss[0];
    theId = ss[1];
    expiresStr = ss[2];
    expires = parseInt(expiresStr, 10);
    sha1 = ss[3];
    if (isNaN(expires) || (expires < Date.now()) || !theId || !sha1) {
        return null;
    }
    auth = yield $findUserAuthByProvider(provider, theId);
    if (auth === null) {
        return null;
    }
    // check:
    secure = [provider, theId, expiresStr, auth.passwd, COOKIE_SALT].join(':');
    expected = crypto.createHash('sha1').update(secure).digest('hex');
    console.log('>>> secure: ' + secure);
    console.log('>>> sha1: ' + sha1);
    console.log('>>> expected: ' + expected);
    if (sha1 !== expected) {
        return null;
    }
    if (auth.user.locked_until > Date.now()) {
        console.log('User is locked: ' + auth.user.email);
        return null;
    }
    return auth.user;
}

// middle ware for bind user from session cookie:
function* $userIdentityParser(next) {
    this.request.user = null;
    var
        auth,
        user,
        cookie = this.cookies.get(COOKIE_NAME);
    if (cookie) {
        console.log('try to parse session cookie...');
        user = yield $parseSessionCookie(cookie);
        if (user) {
            user.passwd = '******';
            this.request.user = user;
            console.log('bind user from session cookie: ' + user.email);
        }
        else {
            console.log('invalid session cookie. cleared.');
            this.cookies.set(COOKIE_NAME, 'deleted', {
                path: '/',
                httpOnly: true,
                expires: new Date(0)
            });
        }
        yield next;
        return;
    }
    auth = this.request.get('authorization');
    if (auth) {
        console.log('try to parse authorization header...');
        user = yield $parseAuthorization(auth);
        if (user) {
            user.passwd = '******';
            this.request.user = user;
            console.log('bind user from authorization: ' + user.email);
        }
    }
    yield next;
}

module.exports = {

    generatePassword: _generatePassword,

    verifyPassword: _verifyPassword,

    makeSessionCookie: makeSessionCookie,

    $userIdentityParser: $userIdentityParser

};
