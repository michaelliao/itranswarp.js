// auth.js

var
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils');

var
    User = db.user,
    warp = db.warp;

exports = module.exports = {

    'GET /auth/': function(req, res, next) {
        /**
         * Display authentication page.
         */
        res.render('auth/signin.html', {});
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
            var cookie = utils.make_session_cookie('local', user.id, user.passwd, expires);
            res.cookie(utils.SESSION_COOKIE_NAME, utils.make_session_cookie('local', user.id, user.passwd, 0), {
                path: '/',
                expires: new Date(expires)
            });
            console.log('set session cookie for user: ' + user.email);
            user.passwd = '******';
            res.send(user);
        });
    }
}
