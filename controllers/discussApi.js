// discuss api

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),

    utils = require('./_utils'),
    constants = require('../constants');

var
    Board = db.board,
    Topic = db.topic,
    Reply = db.reply,
    warp = db.warp,
    next_id = db.next_id;

function getBoard(board_id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    Board.find(board_id, tx, function (err, board) {
        if (err) {
            return callback(err);
        }
        if (board === null) {
            return callback(api.notFound('Board'));
        }
        return callback(null, board);
    });
}

function getBoards(tx, callback) {
    if (arguments.length === 1) {
        callback = tx;
        tx = undefined;
    }
    Board.findAll({
        order: 'display_order'
    }, tx, callback);
}

function createBoard(name, description, tx, callback) {
    if (arguments.length === 3) {
        callback = tx;
        tx = undefined;
    }
    Board.findNumber('max(display_order)', tx, function (err, num) {
        if (err) {
            return next(err);
        }
        var display_order = (num === null) ? 0 : num + 1;
        Board.create({
            name: name,
            description: description,
            display_order: display_order
        }, tx, callback);
    });
}

function lockBoard(board_id, tx, callback) {
    getBoard(board_id, tx, function (err, board) {
        if (err) {
            return callback(err);
        }
        if (board.locked) {
            return callback(null, board);
        }
        board.locked = false;
        Board.update(callback);
    });
}

function getTopic(topic_id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    Topic.find(topic_id, tx, function (err, topic) {
        if (err) {
            return callback(err);
        }
        if (topic === null) {
            return callback(api.notFound('Topic'));
        }
        return callback(null, topic);
    });
}

function getTopics(board_id, page, callback) {
    Topic.findNumber({
        select: 'count(*)',
        where: 'board_id=?',
        params: [board_id]
    }, function (err, num) {
        if (err) {
            return callback(err);
        }
        page.totalItems = num;
        if (page.isEmpty) {
            return callback(null, { page: page, topics: [] });
        }
        Topic.findAll({
            select: ['id', 'board_id', 'topic_id', 'user_id', 'deleted', 'upvotes', 'downvotes', 'score', 'created_at', 'updated_at', 'version'],
            where: 'board_id=?',
            params: [board_id],
            order: 'publish_at desc',
            offset: page.offset,
            limit: page.limit
        }, function (err, entities) {
            if (err) {
                return callback(err);
            }
            return callback(null, {
                page: page,
                topics: entities
            });
        });
    });
}

function createTopic(board_id, user_id, name, tags, content, tx, callback) {
    if (arguments.length === 6) {
        callback = tx;
        tx = undefined;
    }
    warp.transaction(function (err, tx) {
        if (err) {
            return callback(err);
        }
        async.waterfall([
            function (callback) {
                getBoard(board_id, tx, callback);
            },
            function (board, callback) {
                Topic.create({
                    board_id: board_id,
                    user_id: user_id,
                    name: name,
                    tags: tags,
                    content:content
                }, callback);
            },
            function (topic, callback) {
                warp.update('update boards set topics = topics + 1 where id=?', [board_id], tx, function (err, r) {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, topic);
                });
            }
        ], function (err, result) {
            tx.done(err, function (err) {
                if (err) {
                    return callback(err);
                }
                return res.send(result);
            });
        });
    });
}

function deleteTopic(topic_id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    warp.transaction(function (err, tx) {
        if (err) {
            return callback(err);
        }
        async.waterfall([
            function (callback) {
                getTopic(topic_id, tx, callback);
            },
            function (topic, callback) {
                topic.destroy(tx, callback);
            }
        ], function (err, results) {
            tx.done(err, function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, topic_id);
            });
        });
    });
}

function formatText(s) {
    return s.replace(/\r/g, '').replace(/\n+/g, '\n').replace(/\&/g, '&amp;').replace(/</g, '&lt;').replace(/\>/g, '&gt;');
}

module.exports = {

    'POST /api/boards/:id/topics': function (req, res, next) {
        if (utils.isForbidden(req, constants.ROLE_SUBSCRIBER)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var
            board_id = req.params.id,
            name = utils.getParam('name', null, req),
            tags = utils.getParam('tags', '', req),
            name, content;
        try {
            name = getRequiredParam('name', req);
            content = getRequiredParam('content', req);
        }
        catch (e) {
            return next(e);
        }
        createTopic(board_id, req.user.id, name, tags, content, function (err, topic) {
            if (err) {
                return next(err);
            }
            // attach user:
            topic.user_name = req.user.name;
            topic.user_image_url = req.user.image_url;
            return res.send(topic);
        });
    },

    'POST /api/topics/:id/delete': function (req, res, next) {
        /**
         * Delete a topic by its id.
         * 
         * @name Delete Topic
         * @param {string} id - The id of the topic.
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
