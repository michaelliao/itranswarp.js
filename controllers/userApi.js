// user api

var
    async = require('async');
var
    api = require('../api'),
    db = require('../db'),
    auth = require('./_auth'),
    utils = require('./_utils'),
    config = require('../config'),
    constants = require('../constants');

var
    User = db.user,
    AuthUser = db.authuser,
    warp = db.warp,
    next_id = db.next_id;

var LOCK_TIMES = {
    d: 86400000,
    w: 604800000,
    m: 2592000000,
    y: 31536000000
};

var isSecure = config.session.httpsForManagement;

function getUsers(page, callback) {
    User.findNumber('count(*)', function (err, num) {
        if (err) {
            return callback(err);
        }
        page.totalItems = num;
        if (page.isEmpty) {
            return callback(null, {
                page: page,
                users: []
            });
        }
        User.findAll({
            offset: page.offset,
            limit: page.limit,
            order: 'created_at desc'
        }, function (err, users) {
            if (err) {
                return callback(err);
            }
            return callback(null, {
                page: page,
                users: users
            });
        });
    });
}

function getUser(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    User.find(id, tx, function (err, user) {
        if (err) {
            return callback(err);
        }
        if (user === null) {
            return callback(api.notFound('User'));
        }
        callback(null, user);
    });
}

function lockUser(id, time, callback) {
    getUser(id, function (err, user) {
        if (err) {
            return callback(err);
        }
        if (user.role === constants.ROLE_ADMIN) {
            return callback(api.invalidParam('time'));
        }
        user.locked_util = time;
        user.update(['locked_util', 'updated_at', 'version'], callback);
    });
}

function createAuthUser(user, authUser, callback) {
    warp.transaction(function (err, tx) {
        if (err) {
            return callback(err);
        }
        async.series({
            authuser: function (callback) {
                AuthUser.create(authUser, tx, callback);
            },
            user: function (callback) {
                User.create(user, tx, callback);
            }
        }, function (err, result) {
            tx.done(err, function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.authuser, result.user);
            });
        });
    });
}

function processAuthentication(provider, authentication, callback) {
    console.log(JSON.stringify(authentication));
    var auth_id = provider + ':' + authentication.auth_id;
    AuthUser.find({
        where: 'auth_id=?',
        params: [auth_id]
    }, function (err, au) {
        if (err) {
            return callback(err);
        }
        if (au === null) {
            var
                user_id = next_id(),
                user = {
                    id: user_id,
                    email: user_id + '@' + provider,
                    name: authentication.name,
                    passwd: '',
                    image_url: authentication.image_url || '/static/img/user.png'
                },
                authUser = {
                    user_id: user_id,
                    auth_provider: provider,
                    auth_id: auth_id,
                    auth_token: authentication.access_token,
                    expires_at: Date.now() + authentication.expires_in
                };
            createAuthUser(user, authUser, function (err, au, u) {
                if (err) {
                    return callback(err);
                }
                return callback(null, au, u);
            });
            return;
        }
        // update auth user:
        au.auth_token = authentication.access_token;
        au.expires_at = Date.now() + authentication.expires_in;
        au.update(['auth_token', 'expires_at', 'updated_at', 'version'], function (err, result) {
            getUser(au.user_id, function (err, u) {
                if (err) {
                    return callback(err);
                }
                if (u.name === authentication.name && u.image_url === authentication.image_url) {
                    return callback(null, au, u);
                }
                // update user:
                u.name = authentication.name;
                u.image_url = authentication.image_url;
                u.update(function (err, u) {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, au, u);
                });
            });
        });
    });
}

module.exports = {

    getUser: getUser,

    getUsers: getUsers,

    'POST /api/users/:id/lock': function (req, res, next) {
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var t, userId, now, m;
        try {
            t = utils.getRequiredParam('time', req);
        } catch (e) {
            return next(e);
        }
        userId = req.params.id;
        now = Date.now();
        if (typeof t === 'string') {
            m = t.match(/^(\d{1,4})(d|w|m|y)$/);
            if (m === null) {
                return next(api.invalidParam('time', 'Invalid time.'));
            }
            t = now + parseInt(m[1], 10) * LOCK_TIMES[m[2]];
        } else if (typeof t !== 'number') {
            return next(api.invalidParam('time', 'Invalid time.'));
        }
        lockUser(userId, t, function (err, r) {
            if (err) {
                return next(err);
            }
            return res.send({ id: userId, locked_util: t, now: now });
        });
    },

    'GET /auth/signout': function (req, res, next) {
        res.clearCookie(utils.SESSION_COOKIE_NAME);
        var referer = req.get('referer') || '/';
        if (referer.indexOf('/manage/') >= 0 || referer.indexOf('/auth/') >= 0) {
            referer = '/';
        }
        res.redirect(referer);
    },

    'GET /manage/signout': function (req, res, next) {
        res.clearCookie(utils.SESSION_COOKIE_NAME, {
            path: '/',
            secure: isSecure
        });
        res.redirect('/');
    },

    'GET /manage/signin': function (req, res, next) {
        /**
         * Display authentication page.
         */
        res.render('manage/signin.html', {});
    },

    'GET /auth/from/:name': function (req, res, next) {
        var provider, redirect, redirect_uri, jscallback;
        provider = auth[req.params.name];
        if (provider) {
            redirect = req.get('referer');
            if (redirect.indexOf('/auth/') >= 0 || redirect.indexOf('/manage') >= 0) {
                redirect = '/';
            }
            redirect_uri = 'http://' + req.host + '/auth/callback/' + req.params.name + '?redirect=' + encodeURIComponent(redirect);
            jscallback = req.query.jscallback;
            if (jscallback) {
                redirect_uri = redirect_uri + '&jscallback=' + jscallback;
            }
            return res.redirect(provider.getAuthenticateURL({
                redirect_uri: redirect_uri
            }));
        }
        return res.send(404, 'Not Found');
    },

    'GET /auth/callback/:name': function (req, res, next) {
        var providerName, provider, code, jscallback;

        providerName = req.params.name;
        provider = auth[req.params.name];
        jscallback = req.query.jscallback;

        if (!provider) {
            return res.send(404, 'Not Found');
        }
        code = req.query.code;
        if (!code) {
            // something error:
            console.log('oauth signin failed...');
            if (jscallback) {
                return res.send('<html><body><script> self.close(); </script></body></html>');
            }
            return res.redirect(req.query.redirect || '/');
        }
        provider.getAuthentication({
            code: code
        }, function (err, authentication) {
            if (err) {
                res.send(err);
            }
            // check AuthUser:
            processAuthentication(providerName, authentication, function (err, authUser, user) {
                var cookieStr = utils.makeSessionCookie(providerName, authUser.id, authUser.auth_token, authUser.expires_at);
                res.cookie(utils.SESSION_COOKIE_NAME, cookieStr, {
                    path: '/',
                    expires: new Date(authUser.expires_at)
                });
                if (jscallback) {
                    return res.send('<html><body><script> window.opener.' + jscallback + '(' + JSON.stringify({
                        id: user.id,
                        name: user.name,
                        image_url: user.image_url
                    }) + ');self.close(); </script></body></html>');
                }
                res.redirect(req.query.redirect || '/');
            });
        });
    },

    'POST /api/authenticate': function (req, res, next) {
        var email, passwd;
        try {
            email = utils.getRequiredParam('email', req);
            passwd = utils.getRequiredParam('passwd', req);
        } catch (e) {
            return next(e);
        }
        User.find({
            where: 'email=?',
            params: [email]
        }, function (err, user) {
            if (err) {
                return next(err);
            }
            if (!user || !user.passwd || user.passwd !== passwd) {
                return next(api.error('auth:failed', '', 'Bad email or password.'));
            }
            if (user.locked_util > Date.now()) {
                return next(api.error('auth:locked', '', 'User is locked.'));
            }
            var
                expires = Date.now() + 604800000, // 7 days
                cookieStr = utils.makeSessionCookie('local', user.id, user.passwd, expires);
            res.cookie(utils.SESSION_COOKIE_NAME, cookieStr, {
                path: '/',
                secure: isSecure,
                expires: new Date(expires)
            });
            console.log('set session cookie for user: ' + user.email);
            user.passwd = '******';
            res.send(user);
        });
    }
};
