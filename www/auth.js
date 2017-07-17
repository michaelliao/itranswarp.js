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
 * 
 * @author: Michael Liao
 */

const
    crypto = require('crypto'),
    logger = require('./logger'),
    config = require('./config'),
    api = require('./api'),
    db = require('./db'),
    User = db.User,
    LocalUser = db.LocalUser,
    AuthUser = db.AuthUser,
    constants = require('./constants'),
    COOKIE_NAME = config.session.cookie,
    COOKIE_SALT = config.session.salt,
    COOKIE_EXPIRES_IN_MS = config.session.expires * 1000,
    // for safe base64 replacements:
    re_add = new RegExp(/\+/g),
    re_sla = new RegExp(/\//g),
    re_equ = new RegExp(/\=/g),
    re_r_add = new RegExp(/\-/g),
    re_r_sla = new RegExp(/\_/g),
    re_r_equ = new RegExp(/\./g);

function generatePassword(salt, inputPassword) {
    return crypto.createHash('sha1').update(salt + ':' + inputPassword).digest('hex');
}

function verifyPassword(salt, inputPassword, expectedPassword) {
    return expectedPassword === crypto.createHash('sha1').update(salt + ':' + inputPassword).digest('hex');
}

// string -> base64:
function _safe_b64encode(s) {
    let b64 = Buffer.from(s).toString('base64');
    return b64.replace(re_add, '-').replace(re_sla, '_').replace(re_equ, '.');
}

// base64 -> string
function _safe_b64decode(s) {
    let b64 = s.replace(re_r_add, '+').replace(re_r_sla, '/').replace(re_r_equ, '=');
    return Buffer.from(b64, 'base64').toString();
}

// Generate a secure client session cookie by constructing string:
// base64(provider:id:expires:sha1(provider:id:expires:passwd:salt)).
function makeSessionCookie(provider, theId, passwd, expires=0) {
    let
        now = Date.now(),
        min = now + 86400000, // 1 day
        max = now + 2592000000; // 30 days
    if (expires === 0) {
        expires = now + COOKIE_EXPIRES_IN_MS;
    } else if (expires < min) {
        expires = min;
    } else if (expires > max) {
        expires = max;
    }
    let
        secure = [provider, theId, String(expires), passwd, COOKIE_SALT].join(':'),
        sha1 = crypto.createHash('sha1').update(secure).digest('hex'),
        str = [provider, theId, expires, sha1].join(':');
    logger.info('make session cookie: ' + str);
    logger.info('session cookie expires at ' + new Date(expires).toLocaleString());
    return _safe_b64encode(str);
}

async function findUserAuthByProvider(provider, id) {
    let user, passwd;
    if (provider === constants.signin.LOCAL) {
        let lu = await LocalUser.findById(id);
        if (lu === null) {
            return null;
        }
        passwd = lu.passwd;
        user = await User.findById(lu.user_id);
    }
    else {
        let au = await AuthUser.findById(id);
        if (au === null) {
            return null;
        }
        passwd = au.auth_token;
        user = await User.findById(au.user_id);
    }
    return {
        user: user,
        passwd: passwd
    };
}

// parseSessionCookie:
// provider:uid:expires:sha1(provider:uid:expires:passwd:salt)
async function parseSessionCookie(s) {
    let decoded = _safe_b64decode(s);
    logger.info('decode cookie to: ' + decoded);
    let ss = decoded.split(':');
    if (ss.length !== 4) {
        return null;
    }
    let
        provider = ss[0],
        theId = ss[1],
        expiresStr = ss[2],
        sha1 = ss[3],
        expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || (expires < Date.now()) || !theId || !sha1) {
        return null;
    }
    let auth = await findUserAuthByProvider(provider, theId);
    if (auth === null) {
        return null;
    }
    // check:
    let
        secure = [provider, theId, expiresStr, auth.passwd, COOKIE_SALT].join(':'),
        expected = crypto.createHash('sha1').update(secure).digest('hex');
    if (sha1 !== expected) {
        return null;
    }
    if (auth.user.locked_until > Date.now()) {
        logger.debug('User is locked: ' + auth.user.email);
        return null;
    }
    return auth.user;
}

module.exports = {

    generatePassword: generatePassword,

    verifyPassword: verifyPassword,

    makeSessionCookie: makeSessionCookie,

    parseSessionCookie: parseSessionCookie

};
