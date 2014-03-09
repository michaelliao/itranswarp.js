// auth.js

var
    api = require('../api'),
    db = require('../db');

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
            return next(err);
        }).success(function(user) {
            if ( !user || !user.passwd || user.passwd!=passwd) {
                return res.send(api.error('auth:failed', '', 'Bad email or password.'));
            }
            user.passwd = '******';
            res.send(user);
        });
    }
}
