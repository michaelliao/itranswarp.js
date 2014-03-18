// dao for db functions.

var
    _ = require('lodash'),
    async = require('async'),
    crypto = require('crypto'),
    config = require('../config'),
    api = require('../api'),
    db = require('../db');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    Page = db.page,
    Attachment = db.attachment,
    Resource = db.resource,
    sequelize = db.sequelize,
    next_id = db.next_id;

function find(Type, options, tx, fn) {
    if (typeof(options)!=='object') {
        options = {
            where: {
                id: options
            }
        };
    }
    options = options || {}
    if (typeof(tx)==='function') {
        fn = tx;
        tx = undefined;
    }
    if (tx) {
        options.transaction = tx;
    }
    return Type.find(options).error(function(err) {
        return fn(err);
    }).success(function(entity) {
        if (entity===null) {
            return fn(api.not_found(Type.name));
        }
        return fn(null, entity);
    });
}

function findAll(Type, options, tx, fn) {
    options = options || {}
    if (typeof(tx)==='function') {
        fn = tx;
        tx = undefined;
    }
    Type.findAll(options).error(function(err) {
        return fn(err);
    }).success(function(entities) {
        return fn(null, entities);
    });
}

function create(Instance, tx, fn) {
    //
}

exports = module.exports = {

    findAll: function(Type, options, fn) {
        Type.findAll(options).error(function(err) {
            return fn(err);
        }).success(function(arr) {
            return fn(null, arr);
        });
    },

    find: function(Type, id, fn) {
        Type.find(id).error(function(err) {
            return fn(err);
        }).success(function(entity) {
            if ( ! entity) {
                return fn(api.not_found(Type.name));
            }
            return fn(null, entity);
        });
    },

    destroy: function(Type, id, fn) {
        Type.find(id).error(function(err) {
            fn(err);
        }).success(function(entity) {
            if ( ! entity) {
                return fn(api.not_found(Type.name));
            }
            entity.destroy().error(function(err) {
                return fn(err);
            }).success(function() {
                return fn(null);
            });
        });
    },

    get_user: function(id, fn) {
        User.find(id).error(function(err) {
            fn(err);
        }).success(function(obj) {
            if (! obj) {
                return fn(api.not_found('user', 'User not found.'));
            }
            fn(null, obj);
        });
    },

    transaction: function(tx_tasks, fn) {
        var options = { transaction: null };
        var tasks = _.map(tx_tasks, function(fn) {
            return function(callback) {
                fn(options.transaction, callback);
            };
        });
        sequelize.transaction(function(t) {
            options.transaction = t;
            async.series(tasks, function(err, results) {
                if (err) {
                    console.log('will be rollback...');
                    t.rollback().success(function() {
                        fn(err);
                    });
                }
                else {
                    t.commit().error(function(err) {
                        console.log('commit failed. will be rollback...');
                        fn(err);
                    }).success(function() {
                        fn(null, results);
                    });
                }
            });
        });
    },

    save: function(type, data, tx, fn) {
        var options = {};
        if (typeof(tx)==='function') {
            fn = tx;
        }
        else {
            options.transaction = tx;
        }
        type.create(data, options).error(function(err) {
            fn(err);
        }).success(function(obj) {
            fn(null, obj);
        });
    }
}
