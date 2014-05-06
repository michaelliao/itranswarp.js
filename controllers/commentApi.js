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
    return s.replace(/\r/g, '').replace(/\n+/g, '\n').replace(/\&/g, '&amp;').replace(/</g, '&lt;').replace(/\>/g, '&gt;');
}

function createComment(ref_type, ref_id, user, content, tx, callback) {
    if (arguments.length === 5) {
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
    }, tx, function (err, entity) {
        if (err) {
            return callback(err);
        }
        return callback(null, entity);
    });
}

function getCommentsByRef(ref_id, from_id, callback) {
    var query, limit = 20;
    if (arguments.length === 2) {
        callback = from_id;
        from_id = null;
    }
    if (from_id) {
        query = {
            where: 'ref_id=? and id<=?',
            params: [ref_id, from_id]
        };
    } else {
        query = {
            where: 'ref_id=?',
            params: [ref_id]
        };
    }
    query.limit = limit + 1;
    query.order = 'id desc';
    Comment.findAll(query, function (err, comments) {
        if (err) {
            return callback(err);
        }
        var lastId = null;
        if (comments.length > limit) {
            lastId = comments.pop().id;
        }
        callback(null, {
            comments: comments,
            nextCommentId: lastId
        });
    });
}

function getComments(ref_id, page, callback) {
    if (arguments.length === 2) {
        callback = page;
        page = ref_id;
        ref_id = undefined;
    }
    var query = {
        select: 'count(id)'
    };
    if (ref_id) {
        query.where = 'ref_id=?';
        query.params = [ref_id];
    }
    Comment.findNumber(query, function (err, num) {
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
        Comment.findAll(query2, function (err, comments) {
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
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    Comment.find(id, tx, function (err, c) {
        if (err) {
            return callback(err);
        }
        c.destroy(tx, function (err, r) {
            if (err) {
                return callback(err);
            }
            callback(null, { id: c.id });
        });
    });
}

function deleteComments(ref_id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    warp.update('', [ref_id], tx, function (err, r) {
        if (err) {
            return callback(err);
        }
        callback(null, true);
    });
}

module.exports = {

    createComment: createComment,

    deleteComments: deleteComments,

    deleteComment: deleteComment,

    getComments: getComments,

    getCommentsByRef: getCommentsByRef,

    'POST /api/comments/:id/delete': function (req, res, next) {
        /**
         * Delete a comment by its id.
         * 
         * @param {string} :id - The id of the comment.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        async.waterfall([
            function (callback) {
                Comment.find(req.params.id, callback);
            },
            function (comment, callback) {
                if (comment === null) {
                    return callback(api.notFound('Comment'));
                }
                comment.destroy(callback);
            }
        ], function (err, result) {
            if (err) {
                return next(err);
            }
            return res.send({ id: req.params.id });
        });
    }
};
