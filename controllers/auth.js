// auth.js

var
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils');

var
    User = db.user,
    Article = db.article,
    sequelize = db.sequelize;

exports = module.exports = {

    'GET /auth/': function(req, res, next) {
        /**
         * Display authentication page.
         */
        res.render('auth/signin.html', {});
    },

    'POST /api/authenticate': function(req, res, next) {
        var email = utils.get_required_param('email', req),
            passwd = utils.get_required_param('passwd', req);
        if (! email) {
            return res.send(api.invalid_param('email'));
        }
        if (! passwd) {
            return res.send(api.invalid_param('passwd'));
        }
        utils.find(User, {
            where: {
                email: email
            }
        }, function(err, user) {
            if (err) {
                return next(err);
            }
            if ( !user || !user.passwd || user.passwd!=passwd) {
                return res.send(api.error('auth:failed', '', 'Bad email or password.'));
            }
            if (user.locked_util > Date.now()) {
                return res.send(api.error('auth:locked', '', 'User is locked.'));
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
