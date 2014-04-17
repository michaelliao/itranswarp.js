// comment api

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),

    utils = require('./_utils'),
    constants = require('../constants');

var
    Comment = db.comment,
    warp = db.warp,
    next_id = db.next_id;

function formatComment(s) {
    return s.replace(/\r/g, '').replace(/\n+/g, '\n').replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
}

function createComment(ref_type, ref_id, user, content, tx, callback) {
    if (arguments.length===5) {
        callback = tx;
        tx = undefined;
    }
    var fc = formatComment(content);
    if (fc.length > 1000) {
        return callback(api.invalidParam('content', 'Content is too long.'));
    }
    Comment.create({
        ref_type: ref_type,
        ref_id: ref_id,
        user_id: user.id,
        user_name: user.name,
        user_image_url: user.image_url,
        content: fc
    }, tx, function(err, entity) {
        if (err) {
            return callback(err);
        }
        return callback(null, entity);
    });
}

function getComments(ref_id, page, callback) {
    if (arguments.length===2) {
        callback = page;
        page = ref_id;
        ref_id = undefined;
    }
    console.log('PAGE -----> ' + JSON.stringify(page));
    var query = {
        select: 'count(id)'
    };
    if (ref_id) {
        query.where = 'ref_id=?';
        query.params = [ref_id];
    }
    Comment.findNumber(query, function(err, num) {
        if (err) {
            return callback(err);
        }
        page.totalItems = num;
        if (page.isEmpty) {
            return callback(null, {
                page: page,
                comments: []
            });
        }
        console.log('PAGE -----> ' + JSON.stringify(page));
        var query2 = {
            select: '*',
            offset: page.offset,
            limit: page.limit,
            order: 'created_at desc'
        };
        if (ref_id) {
            query2.where = 'ref_id=?';
            query2.params = [ref_id];
        }
        Comment.findAll(query2, function(err, comments) {
            if (err) {
                return callback(err);
            }
            return callback(null, {
                page: page,
                comments: comments
            });
        });
    });
}

function deleteComment(id, tx, callback) {
    if (arguments.length===2) {
        callback = tx;
        tx = undefined;
    }
    Comment.find(id, tx, function(err, c) {
        if (err) {
            return callback(err);
        }
        c.destroy(tx, function(err, r) {
            if (err) {
                return callback(err);
            }
            callback(null, { id: c.id });
        });
    });
}

function deleteComments(ref_id, tx, callback) {
    if (arguments.length===2) {
        callback = tx;
        tx = undefined;
    }
    warp.update('', [ref_id], tx, function(err, r) {
        if (err) {
            return callback(err);
        }
        callback(null, true);
    });
}

exports = module.exports = {

    createComment: createComment,

    deleteComments: deleteComments,

    deleteComment: deleteComment,

    getComments: getComments,

    'GET /api/categories': function(req, res, next) {
        /**
         * Get all categories.
         * 
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        getCategories(function(err, array) {
            if (err) {
                return next(err);
            }
            return res.send({ categories: array });
        });
    },

    'GET /api/categories/:id': function(req, res, next) {
        /**
         * Get categories by id.
         * 
         * @param {string} :id - The id of the category.
         * @return {object} Category object.
         */
        getCategory(req.params.id, function(err, obj) {
            if (err) {
                return next(err);
            }
            return res.send(obj);
        });
    },

    'POST /api/categories': function(req, res, next) {
        /**
         * Create a new category.
         * 
         * @param {string} name - The name of the category.
         * @param {string,optional} description - The description of the category.
         * @return {object} Category object that was created.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        try {
            var name = utils.getRequiredParam('name', req);
        }
        catch (e) {
            return next(e);
        }
        var description = utils.getParam('description', '', req);

        Category.findNumber('max(display_order)', function(err, num) {
            if (err) {
                return next(err);
            }
            Category.create({
                name: name,
                description: description,
                display_order: (num===null) ? 0 : num + 1
            }, function(err, entity) {
                if (err) {
                    return next(err);
                }
                return res.send(entity);
            });
        });
    },

    'POST /api/categories/sort': function(req, res, next) {
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        Category.findAll(function(err, entities) {
            if (err) {
                return next(err);
            }
            var ids = req.body.id;
            if (! Array.isArray(ids)) {
                ids = [ids];
            }
            if (entities.length!==ids.length) {
                return next(api.invalidParam('id', 'Invalid id list.'));
            }
            for (var i=0; i<entities.length; i++) {
                var entity = entities[i];
                var pos = ids.indexOf(entity.id);
                if (pos===(-1)) {
                    return next(api.invalidParam('id', 'Invalid id parameters.'));
                }
                entity.display_order = pos;
            }
            warp.transaction(function(err, tx) {
                if (err) {
                    return next(err);
                }
                async.series(_.map(entities, function(entity) {
                    return function(callback) {
                        entity.update(['display_order'], tx, callback);
                    };
                }), function(err, result) {
                    tx.done(err, function(err) {
                        console.log(err===null ? 'tx committed' : 'tx rollbacked');
                        if (err) {
                            return next(err);
                        }
                        return res.send({ sort: true });
                    });
                });
            });
        });
    },

    'POST /api/categories/:id': function(req, res, next) {
        /**
         * Update a category.
         * 
         * @param {string} :id - The id of the category.
         * @param {string,optional} name - The new name of the category.
         * @param {string,optional} description - The new description of the category.
         * @return {object} Category object that was updated.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var name = utils.getParam('name', req),
            description = utils.getParam('description', req);
        if (name!==null) {
            if (name==='') {
                return next(api.invalidParam('name'));
            }
        }
        Category.find(req.params.id, function(err, entity) {
            if (err) {
                return next(err);
            }
            if (entity===null) {
                return next(api.notFound('Category'));
            }
            if (name!==null) {
                entity.name = name;
            }
            if (description!==null) {
                entity.description = description;
            }
            entity.update(function(err, entity) {
                if (err) {
                    return next(err);
                }
                return res.send(entity);
            });
        });
    },

    'POST /api/categories/:id/delete': function(req, res, next) {
        /**
         * Delete a category by its id.
         * 
         * @param {string} :id - The id of the category.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        async.waterfall([
            function(callback) {
                getCategory(req.params.id, callback);
            },
            function(category, callback) {
                Article.findNumber({
                    select: 'count(*)',
                    where: 'category_id=?',
                    params: [category.id]
                }, function(err, num) {
                    if (err) {
                        return callback(err);
                    }
                    if (num > 0) {
                        return callback(api.resourceConflictError('Category', 'Category is in use and cannot be deleted.'));
                    }
                    callback(null, category);
                });
            },
            function(category, callback) {
                category.destroy(callback);
            }
        ], function(err, result) {
            if (err) {
                return next(err);
            }
            return res.send({ id: req.params.id });
        });
    }
}
