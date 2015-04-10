'use strict';

// user api

var
    _ = require('lodash'),
    thunkify = require('thunkify'),
    api = require('../api'),
    db = require('../db'),
    auth = require('../auth'),
    helper = require('../helper'),
    config = require('../config'),
    json_schema = require('../json_schema'),
    constants = require('../constants');

var
    User = db.user,
    AuthUser = db.authuser,
    warp = db.warp,
    next_id = db.next_id;

var LOCAL_SIGNIN_EXPIRES = 3600 * 24 * 7; // 7 days

var LOCK_TIMES = {
    d: 86400000,
    w: 604800000,
    m: 2592000000,
    y: 31536000000
};

// init oauth2 providers:

var oauth2_providers = {};

_.each(config.oauth2, function (cfg, name) {
    var provider = oauth2.createProvider(
        name,
        cfg.app_key,
        cfg.app_secret,
        cfg.redirect_uri
    );
    provider.$getAuthentication = thunkify(provider.getAuthentication);
    oauth2_providers[name] = provider;
    console.log('Init OAuth2: ' + name + ', redirect_uri = ' + provider.redirect_uri);
});

function* $getUsers(page) {
    page.total = yield User.$findNumber('count(id)');
    if (page.isEmpty) {
        return [];
    }
    var users = yield User.$findAll({
        offset: page.offset,
        limit: page.limit,
        order: 'created_at desc'
    });
    _.each(users, function (u) {
        u.passwd = '******';
    });
    return users;
}

function* $getUserByEmail(email) {
    return yield User.$find({
        where: 'email=?',
        params: [email],
        limit: 1
    });
}

function* $getUser(id) {
    var user = yield User.$find(id);
    if (user === null) {
        throw api.notFound('User');
    }
    user.passwd = '******';
    return user;
}

function* $bindUsers(entities, propName) {
    var i, entity, u, prop = propName || 'user_id';
    for (i=0; i<entities.length; i++) {
        entity = entities[i];
        entity.user = yield User.$find({
            select: ['id', 'name', 'image_url'],
            where: 'id=?',
            params: [entity[prop]]
        });
    }
}

function* $lockUser(id, lockTime) {
    var user = yield $getUser(id);
    if (user.role <= constants.role.ADMIN) {
        throw api.notAllowed('Cannot lock admin user.');
    }
    user.locked_until = lockTime;
    yield user.$update(['locked_until']);
    return lockTime;
}

function* $processOAuthAuthentication(provider_name, authentication) {
    var
        auth_id = provider_name + ':' + authentication.auth_id,
        auth_user,
        user,
        user_id;
    auth_user = yield AuthUser.$find({
        where: 'auth_id=?',
        params: [auth_id]
    });
    if (auth_user === null) {
        // first time to signin:
        user_id = next_id();
        user = {
            id: user_id,
            email: user_id + '@' + provider_name,
            name: authentication.name,
            passwd: '',
            image_url: authentication.image_url || '/static/img/user.png'
        };
        auth_user = {
            user_id: user_id,
            auth_provider: provider_name,
            auth_id: auth_id,
            auth_token: authentication.access_token,
            expires_at: Date.now() + authentication.expires_in
        };
        yield AuthUser.$create(auth_user);
        yield User.$create(user);
        return {
            user: user,
            auth_user: auth_user
        };
    }
    // not first time to signin:
    auth_user.auth_token = authentication.access_token;
    auth_user.expires_at = Date.now() + authentication.expires_in;
    yield auth_user.$update(['auth_token', 'expires_at', 'updated_at', 'version']);
    // find user:
    user = yield User.$find(auth_user.user_id);
    if (user === null) {
        console.log('Logic error: user not found!');
        user_id = auth_user.user_id;
        user = {
            id: user_id,
            email: user_id + '@' + provider_name,
            name: authentication.name,
            passwd: '',
            image_url: authentication.image_url || '/static/img/user.png'
        };
        yield User.$create(user);
    }
    return {
        user: user,
        auth_user: auth_user
    };
}

function getReferer(request) {
    var url = request.get('referer') || '/';
    if (url.indexOf('/auth/') >= 0 || url.indexOf('/manage/') >= 0) {
        url = '/';
    }
    return url;
}

module.exports = {

    $getUser: $getUser,

    $getUsers: $getUsers,

    $bindUsers: $bindUsers,

    'GET /api/users/:id': function* (id) {
        helper.checkPermission(this.request, constants.role.EDITOR);
        this.body = yield $getUser(id);
    },

    'GET /api/users': function* () {
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            page = helper.getPage(this.request),
            users = yield $getUsers(page);
        this.body = {
            page: page,
            users: users
        };
    },

    'POST /api/authenticate': function* () {
        /**
         * Authenticate user by email and password, for local user only.
         * 
         * @param email: Email address, in lower case.
         * @param passwd: The password, 40-chars SHA1 string, in lower case.
         */
        var
            email,
            passwd,
            user,
            data = this.request.body;
        json_schema.validate('authenticate', data);

        email = data.email,
        passwd = data.passwd;
        user = yield $getUserByEmail(email);
        if (user === null) {
            throw api.authFailed('email', 'Email not found.');
        }
        if (user.locked_until > Date.now()) {
            throw api.authFailed('locked', 'User is locked.');
        }
        if (user.passwd === '') {
            throw api.authFailed('passwd', 'Cannot signin local.')
        }
        // check password:
        if (!auth.verifyPassword(user.id, passwd, user.passwd)) {
            throw api.authFailed('passwd', 'Bad password.');
        }
        // make session cookie:
        var
            expires = Date.now() + LOCAL_SIGNIN_EXPIRES,
            cookieStr = auth.makeSessionCookie(constants.signin.LOCAL, user.id, user.passwd, expires);
        this.cookies.set(config.session.cookie, cookieStr, {
            path: '/',
            httpOnly: true,
            expires: new Date(expires)
        });
        console.log('set session cookie for user: ' + user.email);
        user.passwd = '******';
        this.body = user;
    },

    'GET /auth/signout': function* () {
        this.cookies.set(config.session.cookie, 'deleted', {
            path: '/',
            httpOnly: true,
            expires: new Date(0)
        });
        var redirect = getReferer(this.request);
        console.log('Signout, goodbye!');
        this.response.redirect(redirect);
    },

    'GET /auth/from/:name': function* (name) {
        var provider, redirect, redirect_uri, jscallback, r;
        provider = oauth2_providers[name];
        if (!provider) {
            this.response.status = 404;
            this.body = 'Invalid URL.';
            return;
        }
        redirect_uri = provider.redirect_uri;
        if (redirect_uri.indexOf('http://') != 0) {
            redirect_uri = 'http://' + this.request.host + '/auth/callback/' + name;
        }
        jscallback = this.request.query.jscallback;
        if (jscallback) {
            redirect_uri = redirect_uri + '?jscallback=' + jscallback;
        }
        else {
            redirect = getReferer(this.request);
            redirect_uri = redirect_uri + '?redirect=' + encodeURIComponent(redirect);
        }
        r = provider.getAuthenticateURL({
            redirect_uri: redirect_uri
        });
        console.log('Redirect to: ' + r);
        this.response.redirect(r);
    },

    'GET /auth/callback/:name': function* (name) {
        var provider, redirect, redirect_uri, code, jscallback, authentication, r, auth_user, user, cookieStr;
        provider = oauth2_providers[name];
        if (!provider) {
            this.response.status = 404;
            this.body = 'Invalid URL.';
            return;
        }
        jscallback = this.request.query.jscallback;
        redirect = this.request.query.redirect || '/';
        code = this.request.query.code;
        if (!code) {
            console.log('OAuth2 callback error: code is not found.');
            this.body = '<html><body>Invalid code.</body></html>';
            return;
        }
        try {
            authentication = yield provider.$getAuthentication({
                code: code
            });
        }
        catch (e) {
            console.log('OAuth2 callback error: get authentication failed.');
            this.body = '<html><body>Authenticate failed.</body></html>';
            return;
        }
        console.log('OAuth2 callback ok: ' + JSON.stringify(authentication));
        r = yield $processOAuthAuthentication(name, authentication);
        auth_user = r.auth_user;
        user = r.user;
        // make session cookie:
        cookieStr = auth.makeSessionCookie(name, auth_user.id, auth_user.auth_token, auth_user.expires_at);
        this.cookies.set(config.session.cookie, cookieStr, {
            path: '/',
            httpOnly: true,
            expires: new Date(auth_user.expires_at)
        });
        console.log('set session cookie for user: ' + user.email);
        if (jscallback) {
            this.body = '<html><body><script> window.opener.'
                      + jscallback
                      + '(' + JSON.stringify({
                          id: user.id,
                          name: user.name,
                          image_url: user.image_url
                      }) + ');self.close(); </script></body></html>';
        }
        else {
            this.response.redirect(redirect);
        }
    },

    'POST /api/users/:id/lock': function* (id) {
        var locked_until = this.request.body.locked_until;
        if (!helper.isInteger(locked_until) || (locked_until < 0)) {
            throw api.invalidParam('locked_until', 'locked_until must be an integer as a timestamp.');
        }
        helper.checkPermission(this.request, constants.role.EDITOR);
        yield $lockUser(id, locked_until);
        this.body = {
            locked_until: locked_until
        };
    },

    'GET /manage/signin': function (req, res, next) {
        /**
         * Display authentication page.
         */
        res.render('manage/signin.html', {});
    }
};
