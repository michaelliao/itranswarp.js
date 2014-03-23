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

/**
 * find a single entity.
 * 
 * @param Type {object} - Object type.
 * @param options {object} - Id or object has more complex where clause.
 * @param tx {object,optional} - Transaction object.
 * @param fn {function} - Callback function with signature (err, entity).
 */
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
    else {
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

/**
 * find entities. If no result, empty array returns.
 * 
 * @param Type {object} - Object type.
 * @param options {object} - Object contains complex where clause.
 * @param tx {object,optional} - Transaction object.
 * @param fn {function} - Callback function with signature (err, array).
 */
function findAll(Type, options, tx, fn) {
    options = options || {}
    if (typeof(tx)==='function') {
        fn = tx;
        tx = undefined;
    }
    else {
        options.transaction = tx;
    }
    Type.findAll(options).error(function(err) {
        return fn(err);
    }).success(function(entities) {
        return fn(null, entities);
    });
}

function save(Type, data, tx, fn) {
    var options = {};
    if (typeof(tx)==='function') {
        fn = tx;
        tx = undefined;
    }
    else {
        options.transaction = tx;
    }
    Type.create(data, options).error(function(err) {
        fn(err);
    }).success(function(obj) {
        fn(null, obj);
    });
}

function destroy(DataObject, tx, callback) {
    var options = {};
    if (typeof(tx)==='function') {
        callback = tx;
        tx = undefined;
    }
    else {
        options.transaction = tx;
    }
    DataObject.destroy(options).error(function(err) {
        return callback(err);
    }).success(function() {
        return callback(null);
    });
}

function destroyById(Type, id, tx, callback) {
    var options = {
        where: {
            id: id
        }
    };
    if (typeof(tx)==='function') {
        callback = tx;
        tx = undefined;
    }
    else {
        options.transaction = tx;
    }
    Type.find(options).error(function(err) {
        callback(err);
    }).success(function(entity) {
        if ( ! entity) {
            return callback(api.not_found(Type.name));
        }
        console.log('destroyById::destroy: tx object is: ' + tx);
        destroy(entity, tx, callback);
    });
}

function updateAttributes(DataObject, attrs, tx, callback) {
    var options = {};
    if (typeof(tx)==='function') {
        callback = tx;
        tx = undefined;
    }
    else {
        options.transaction = tx;
    }
    DataObject.updateAttributes(attrs, options).error(function(err) {
        callback(err);
    }).success(function() {
        callback(null, DataObject);
    });
}

exports = module.exports = {

    find: find,

    findAll: findAll,

    save: save,

    destroy: destroy,

    destroyById: destroyById,

    updateAttributes: updateAttributes,

    get_user: function(id, callback) {
        User.find(id).error(function(err) {
            callback(err);
        }).success(function(obj) {
            if (! obj) {
                return callback(api.not_found('user', 'User not found.'));
            }
            callback(null, obj);
        });
    },

    /**
     * Execute each task serial with tasks: function(prevResult, tx, callback).
     */
    transaction: function(tx_tasks, callback) {
        // each tx_tasks: function(prevResult, callback)
        var options = { transaction: null };
        var tasks = _.map(tx_tasks, function(fn) {
            return function(prevResult, callback) {
                fn(prevResult, options.transaction, callback);
            };
        });
        tasks.unshift(function(callback) {
            // add first task to pass 'null' to next task:
            callback(null, options.transaction);
        });
        sequelize.transaction(function(t) {
            options.transaction = t;
            async.waterfall(tasks, function(err, result) {
                if (err) {
                    console.log('will be rollback...');
                    t.rollback().success(function() {
                        callback(err);
                    });
                }
                else {
                    t.commit().error(function(err) {
                        console.log('commit failed. will be rollback...');
                        callback(err);
                    }).success(function() {
                        callback(null, result);
                    });
                }
            });
        });
    }
}
