// manage.js

var
    api = require('../api'),
    db = require('../db');

var
    User = db.user,
    Article = db.article,
    sequelize = db.sequelize;

// do management console

exports = module.exports = {

    'GET /api/users/:id': function(req, res, next) {
        /**
         * Get user by id.
         * 
         * @param {string} :id - The id of the user.
         * @return {object} User object.
         */
        User.find(req.params.id)
            .error(function(err) {
                return res.send(api.error(err));
            })
            .success(function(user) {
                if ( ! user) {
                    return res.send(api.notfound('user', 'User not found.'));
                }
                user.passwd = '******';
                return res.send(user);
            });
    },

    'POST /api/users/:id': function(req, res, next) {
        /**
         * Update user.
         * 
         * @param {string} :id - The id of the user.
         * @param {string,optional} name - The new name of the user.
         * @return {object} User object.
         */
        User.find(req.params.id)
            .error(function(err) {
                return res.send(api.error(err));
            })
            .success(function(user) {
                if ( ! user) {
                    return res.send(api.notfound('user', 'User not found.'));
                }
                // update user's properties:
                user.passwd = '******';
                var attrs = ['updated_at', 'version'];
                if ('name' in req.body) {
                    user.name = req.body.name.trim();
                    attrs.push('name');
                }
                if (attrs.length > 0) {
                    user.save(attrs).success(function() {
                        res.send(user);
                    })
                    .error(function(err) {
                        res.send(api.error(err));
                    });
                }
                else {
                    res.send(user);
                }
            });
    }

}
