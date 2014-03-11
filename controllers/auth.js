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
        var email = req.body.email,
            passwd = req.body.passwd;

        User.find({
            where: {
                email: email
            }
        }).error(function(err) {
            return res.send(api.error(err));
        }).success(function(user) {
            if ( !user || !user.passwd || user.passwd!=passwd) {
                return res.send(api.error('auth:failed', '', 'Bad email or password.'));
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
