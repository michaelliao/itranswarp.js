// auth.js

var
    async = require('async');
var
    api = require('../api'),
    db = require('../db'),
    auth = require('./_auth'),
    utils = require('./_utils'),
    config = require('../config');

var
    User = db.user,
    AuthUser = db.authuser,
    warp = db.warp,
    next_id = db.next_id;

function getUsers(page, callback) {
    User.findNumber('count(*)', function(err, num) {
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
        }, function(err, users) {
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
    if (arguments.length===2) {
        callback = tx;
        tx = undefined;
    }
    User.find(id, tx, function(err, user) {
        if (err) {
            return callback(err);
        }
        if (user===null) {
            return callback(api.notFound('User'));
        }
        callback(null, user);
    });
}

function createAuthUser(user, authUser, callback) {
    warp.transaction(function(err, tx) {
        if (err) {
            return callback(err);
        }
        async.series({
            auth_user: function(callback) {
                AuthUser.create(authUser, tx, callback);
            },
            user: function(callback) {
                User.create(user, tx, callback);
            }
        }, function(err, result) {
            tx.done(err, function(err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.auth_user, result.user);
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
    }, function(err, au) {
        if (err) {
            return callback(err);
        }
        if (au===null) {
            var user_id = next_id();
            var user = {
                id: user_id,
                email: user_id + '@itranswarp.org',
                name: authentication.name,
                passwd: '',
                image_url: '',
            };
            var authUser = {
                user_id: user_id,
                auth_provider: provider,
                auth_id: auth_id,
                auth_token: authentication.access_token,
                expires_at: Date.now() + authentication.expires_in
            };
            createAuthUser(user, authUser, function(err, au, u) {
                if (err) {
                    return callback(err);
                }
                callback(null, au, u);
            });
            return;
        }
        // update auth user:
        au.auth_token = authentication.access_token;
        au.expires_at = Date.now() + authentication.expires_in;
        au.update(function(err, result) {
            getUser(au.user_id, function(err, u) {
                if (err) {
                    return callback(err);
                }
                if (u.name===authentication.name && u.image_url===authentication.image_url) {
                    return callback(null, au, u);
                }
                // update user:
                u.name = authentication.name;
                u.image_url = authentication.image_url;
                u.update(function(err, u) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, au, u);
                });
            });
        });
    });
}

var httpPrefix = 'http://' + config.domain;
var httpsPrefix = 'https://' + config.domain;

exports = module.exports = {

    getUser: getUser,

    getUsers: getUsers,

    'GET /auth/signout': function(req, res, next) {
        res.clearCookie(utils.SESSION_COOKIE_NAME);
        var referer = req.get('referer') || '/';
        if (referer.indexOf('/manage/')>=0 || referer.indexOf('/auth/')>=0) {
            referer = '/';
        }
        res.redirect(referer);
    },

    'GET /auth/': function(req, res, next) {
        /**
         * Display authentication page.
         */
        res.render('auth/signin.html', {});
    },

    'GET /auth/from/:name': function(req, res, next) {
        var provider = auth[req.params.name];
        if (provider) {
            var redirect = req.get('referer');
            if (redirect.indexOf('/auth/')>=0 || redirect.indexOf('/manage')>=0) {
                redirect = '/';
            }
            var redirect_uri = 'http://' + req.host + '/auth/callback/' + req.params.name + '?redirect=' + encodeURIComponent(redirect);
            var jscallback = req.query.jscallback;
            if (jscallback) {
                redirect_uri = redirect_uri + '&jscallback=' + jscallback;
            }
            return res.redirect(provider.getAuthenticateURL({
                redirect_uri: redirect_uri
            }));
        }
        return res.send(404, 'Not Found');
    },

    'GET /auth/callback/:name': function(req, res, next) {
        var providerName = req.params.name;
        var provider = auth[req.params.name];
        if (! provider) {
            return res.send(404, 'Not Found');
        }
        var code = req.query.code;
        if (! code) {
            // something error:
            console.log('oauth signin failed...');
            var jscallback = req.query.jscallback;
            if (jscallback) {
                return res.send('<html><body><script> self.close(); </script></body></html>');
            }
            return res.redirect(req.query.redirect || '/');
        }
        provider.getAuthentication({
            code: code
        }, function(err, authentication) {
            if (err) {
                res.send(err);
            }
            // check AuthUser:
            processAuthentication(providerName, authentication, function(err, authUser, user) {
                var cookieStr = utils.makeSessionCookie(providerName, authUser.id, authUser.auth_token, authUser.expires_at);
                res.cookie(utils.SESSION_COOKIE_NAME, cookieStr, {
                    path: '/',
                    expires: new Date(authUser.expires_at)
                });
                var jscallback = req.query.jscallback;
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

    'POST /api/authenticate': function(req, res, next) {
        try {
            var email = utils.getRequiredParam('email', req),
                passwd = utils.getRequiredParam('passwd', req);
        }
        catch (e) {
            return next(e);
        }
        User.find({
            where: 'email=?',
            params: [email]
        }, function(err, user) {
            if (err) {
                return next(err);
            }
            if ( !user || !user.passwd || user.passwd!==passwd) {
                return next(api.error('auth:failed', '', 'Bad email or password.'));
            }
            if (user.locked_util > Date.now()) {
                return next(api.error('auth:locked', '', 'User is locked.'));
            }
            var expires = Date.now() + 604800000; // 7 days
            var cookieStr = utils.makeSessionCookie('local', user.id, user.passwd, expires);
            res.cookie(utils.SESSION_COOKIE_NAME, cookieStr, {
                path: '/',
                expires: new Date(expires)
            });
            console.log('set session cookie for user: ' + user.email);
            user.passwd = '******';
            res.send(user);
        });
    }
}
