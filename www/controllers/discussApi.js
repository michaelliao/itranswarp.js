'use strict';

// discuss api

var
    _ = require('lodash'),
    db = require('../db'),
    md = require('../md'),
    api = require('../api'),
    cache = require('../cache'),
    helper = require('../helper'),
    logger = require('../logger'),
    search = require('../search/search'),
    constants = require('../constants'),
    userApi = require('./userApi');

var
    Board = db.board,
    Topic = db.topic,
    Reply = db.reply,
    warp = db.warp,
    nextId = db.nextId;

function indexDiscuss(r) {
    var doc = {
        type: 'discuss',
        id: r.id,
        tags: r.tags || '',
        name: r.name,
        description: '',
        content: helper.html2text(r.content),
        created_at: r.created_at,
        updated_at: r.updated_at,
        url: '/discuss/' + (r.topic_id ? 'topics/' + r.topic_id + '/find/' + r.id : r.board_id + '/' + r.id),
        upvotes: 0
    };
    process.nextTick(function () {
        search.engine.index(doc);
    });
}

function unindexDiscuss(r) {
    process.nextTick(function () {
        search.engine.unindex({
            id: r.id
        });
    });
}

function unindexDiscussByIds(ids) {
    process.nextTick(function () {
        var
            arr = ids,
            fn = function () {
                if (arr.length > 0) {
                    if (arr.length > 10) {
                        search.engine.unindex(arr.splice(arr.length - 10, 10));
                    } else {
                        search.engine.unindex(arr.splice(0, arr.length));
                    }
                    setTimeout(fn, 500);
                }
            };
        fn();
    });
}

async function getNavigationMenus() {
    return [{
        name: 'Discuss',
        url: '/discuss'
    }];
}

async function getBoard(id) {
    var board = await Board.findById(id);
    if (board === null) {
        throw api.notFound('Board');
    }
    return board;
}

async function getBoardByTag(tag) {
    var
        boards = await getBoards(),
        filtered = _.filter(boards, function (b) {
            return b.tag === tag;
        });
    if (filtered.length === 0) {
        throw api.notFound('Board');
    }
    return filtered[0];
}

async function getBoards() {
    return await Board.findAll({
        order: 'display_order'
    });
}

async function lockBoard(id, locked) {
    var board = await getBoard(id);
    if (board.locked !== locked) {
        board.locked = locked;
        await board.save();
    }
    return board;
}

async function getTopic(id) {
    var topic = await Topic.findById(id);
    if (topic === null) {
        throw api.notFound('Topic');
    }
    return topic;
}

async function getAllTopics(page) {
    page.total = await Topic.count();
    if (page.isEmpty) {
        return [];
    }
    return await Topic.findAll({
        attributes: {
            exclude: ['content']
        },
        order: 'id DESC',
        offset: page.offset,
        limit: page.limit
    });
}

async function getTopics(board_id, page) {
    page.total = await Topic.count({
        where: {
            'board_id': board_id
        }
    });
    if (page.isEmpty) {
        return [];
    }
    return await Topic.findAll({
        attributes: {
            exclude: ['content']
        },
        where: {
            'board_id': board_id
        },
        order: 'updated_at DESC',
        offset: page.offset,
        limit: page.limit
    });
}

async function getTopicsByRef(ref_id, page) {
    page.total = await Topic.count({
        where: {
            'ref_id': ref_id
        }
    });
    if (page.isEmpty) {
        return [];
    }
    return await Topic.findAll({
        where: {
            'ref_id': ref_id
        },
        order: 'updated_at DESC',
        offset: page.offset,
        limit: page.limit
    });
}

async function getAllReplies(page) {
    page.total = await Reply.count();
    if (page.isEmpty) {
        return [];
    }
    return await Reply.findAll({
        order: 'id DESC',
        offset: page.offset,
        limit: page.limit
    });
}

async function getReplies(topic_id, page) {
    var num = await Reply.count({
        where: {
            'topic_id': topic_id
        }
    });
    // items = 1 topic + N replies:
    page.total = num + 1;
    if (num === 0) {
        return [];
    }
    return await Reply.findAll({
        where: {
            'topic_id': topic_id
        },
        order: 'id',
        offset: (page.index === 1) ? 0 : (page.offset - 1),
        limit: (page.index === 1) ? (page.limit - 1) : page.limit
    });
}

async function getFirstReplies(topic_id, num) {
    return await Reply.findAll({
        where: {
            'topic_id': topic_id
        },
        order: 'id',
        limit: num
    });
}

async function getReplyPageIndex(topic, reply_id) {
    var num = await Reply.count({
            where: {
                'topic_id': topic.id,
                'id': {
                    $lt: reply_id
                }
            }
        });
    return Math.floor((num + 1) / 20) + 1;
}

async function createReply(user, topic_id, data) {
    var
        reply,
        topic = await getTopic(topic_id);
    if (topic.locked) {
        throw api.conflictError('Topic', 'Topic is locked.');
    }
    reply = await Reply.create({
        topic_id: topic_id,
        user_id: user.id,
        content: md.ugcMarkdownToHtml(data.content)
    });
    // FIXME:
    await Topic.update('update topics set replies=replies+1, version=version+1, updated_at=? where id=?', [Date.now(), topic_id]);
    reply.name = 'Re:' + topic.name;
    indexDiscuss(reply);
    delete reply.name;
    if (topic.ref_id) {
        await cache.remove('REF-TOPICS-' + topic.ref_id);
    }
    return reply;
}

async function createTopic(user, board_id, ref_type, ref_id, data) {
    var
        board = await getBoard(board_id),
        topic = await Topic.create({
            board_id: board_id,
            user_id: user.id,
            ref_type: ref_type,
            ref_id: ref_id,
            name: data.name.trim(),
            tags: (data.tags || '').trim(),
            content: md.ugcMarkdownToHtml(data.content)
        });
    // FIXME:
    await warp.$update('update boards set topics = topics + 1 where id=?', [board_id]);
    indexDiscuss(topic);
    if (ref_id) {
        await cache.remove('REF-TOPICS-' + ref_id);
    }
    return topic;
}

async function loadTopicsByRefWithCache(ref_id, page) {
    if (page.index === 1) {
        var key = 'REF-TOPICS-' + ref_id;
        return await cache.get(key, async () => {
            return await loadTopicsByRef(ref_id, page); 
        });
    }
    return await loadTopicsByRef(ref_id, page);
}

async function loadTopicsByRef(ref_id, page) {
    var
        i,
        topics = await getTopicsByRef(ref_id, page);
    await userApi.bindUsers(topics);
    for (i=0; i<topics.length; i++) {
        await bindReplies(topics[i]);
    }
    return topics;
}

async function bindReplies(topic) {
    var key = 'REPLIES-' + topic.id + '_' + topic.version;
    topic.replies = await cache.get(key, async () => {
        var replies = await getFirstReplies(topic.id, 10);
        await userApi.bindUsers(replies);
        return replies;
    });
}

module.exports = {

    getNavigationMenus: getNavigationMenus,

    createTopic: createTopic,

    getBoard: getBoard,

    getBoardByTag: getBoardByTag,

    getBoards: getBoards,

    getTopic: getTopic,

    getTopics: getTopics,

    getTopicsByRef: getTopicsByRef,

    getReplies: getReplies,

    getFirstReplies: getFirstReplies,

    getReplyPageIndex: getReplyPageIndex,

    'GET /api/ref/:id/topics': async (ctx, next) => {
        /**
         * Get topics by ref id
         */
        var
            page = helper.getPage(ctx.request, 10),
            topics = await loadTopicsByRefWithCache(id, page);
        ctx.rest({
            page: page,
            topics: topics
        });
    },

    'GET /api/boards': async (ctx, next) => {
        /**
         * Get all boards.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.rest({
            boards: await getBoards()
        });
    },

    'POST /api/boards': async (ctx, next) => {
        /**
         * Create new board.
         * 
         * @name Create Board
         * @param {string} name - The name of the board.
         * @param {string} description - The description of the board.
         * @return {object} Board object.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('createBoard');
        var
            num, board,
            data = ctx.request.body;

        num = await Board.max('display_order');
        board = await Board.create({
            name: data.name.trim(),
            tag: data.tag.trim(),
            description: data.description.trim(),
            display_order: ((num === null) ? 0 : num + 1)
        });
        ctx.rest(board);
    },

    'GET /api/boards/:id': async (ctx, next) => {
        ctx.checkPermission(constants.role.EDITOR);
        ctx.rest(await getBoard(id));
    },

    'POST /api/boards/:id': async (ctx, next) => {
        /**
         * Update a board.
         * 
         * @name Update Board
         * @param {string} id - The id of the board.
         * @param {string} [name] - The new name of the board.
         * @param {string} [description] - The new description of the board.
         * @return {object} Board object that was updated.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('updateBoard');

        var
            props = [],
            data = ctx.request.body,
            board = await getBoard(id);
        if (data.name) {
            board.name = data.name.trim();
            props.push('name');
        }
        if (data.description) {
            board.description = data.description.trim();
            props.push('description');
        }
        if (data.tag) {
            board.tag = data.tag.trim();
            props.push('tag');
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            // FIXME:
            await board.$update(props);
        }
        ctx.rest(board);
    },

    'POST /api/boards/:id/lock': async (ctx, next) => {
        /**
         * Lock the board by its id.
         * 
         * @name Lock Board
         * @param {string} id - The id of the board.
         * @return {object} Board object.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest(await lockBoard(id, true));
    },

    'POST /api/boards/:id/unlock': async (ctx, next) => {
        /**
         * Unlock the board by its id.
         * 
         * @name Unlock Board
         * @param {string} id - The id of the board.
         * @return {object} Board object.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest(await lockBoard(id, false));
    },

    'POST /api/boards/all/sort': async (ctx, next) => {
        /**
         * Sort boards.
         *
         * @name Sort Boards
         * @param {array} id: The ids of boards.
         * @return {object} The sort result like { "sort": true }.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('sortBoards');
        var
            board,
            i, pos,
            data = ctx.request.body,
            ids = data.ids,
            boards = await Board.findAll();
        if (ids.length !== boards.length) {
            throw api.invalidParam('ids', 'Invalid id list.');
        }
        for (i=0; i<boards.length; i++) {
            board = boards[i];
            pos = ids.indexOf(board.id);
            if (pos === (-1)) {
                throw api.invalidParam('ids', 'Invalid id list.');
            }
            board.display_order = pos;
        }
        for (i=0; i<boards.length; i++) {
            await boards[i].save({ fields: ['display_order', 'updated_at', 'version'] });
        }
        ctx.rest({ boards: await getBoards() });
    },

    'GET /api/boards/:id/topics': async (ctx, next) => {
        /**
         * Get topics by page.
         */
        ctx.checkPermission(constants.role.EDITOR);
        var
            page = helper.getPage(ctx.request),
            topics = await getTopics(board_id, page);
        ctx.rest({
            page: page,
            topics: topics
        });
    },

    'POST /api/boards/:id/topics': async (ctx, next) => {
        /**
         * Post a new topic.
         *
         * @param {string} id: The id of board.
         * @param {string} name: The name of topic.
         * @param {string} tags: The tags of topic.
         * @param {string} content: The content of topic.
         * @return {object} The topic object.
         */
        ctx.checkPermission(constants.role.SUBSCRIBER);
        ctx.validate('createTopic');
        let
            data = ctx.request.body;
            topic = await createTopic(ctx.request.user, board_id, '', '', data);
        ctx.rest(topic);
    },

    'GET /api/topics': async (ctx, next) => {
        /**
         * Get all topics.
         */
        ctx.checkPermission(constants.role.EDITOR);
        var
            page = helper.getPage(ctx.request),
            topics = await getAllTopics(page);
        await userApi.bindUsers(topics);
        ctx.rest({
            page: page,
            topics: topics
        });
    },

    'GET /api/replies': async (ctx, next) => {
        /**
         * Get all replies by page.
         */
        ctx.checkPermission(constants.role.EDITOR);
        var
            page = helper.getPage(ctx.request),
            replies = await getAllReplies(page);
        await userApi.bindUsers(replies);
        ctx.rest({
            page: page,
            replies: replies
        });
    },

    'POST /api/replies/:id/delete': async (ctx, next) => {
        /**
         * Delete a reply by its id. NOTE delete a reply only mark it is deleted.
         * 
         * @name Delete Reply.
         * @param {string} id - The id of the reply.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        ctx.checkPermission(constants.role.EDITOR);
        let
            id = ctx.request.params.id,
            reply = await Reply.findById(id);
        if (reply === null) {
            throw api.notFound('Reply');
        }
        reply.deleted = true;
        await reply.$update(['deleted', 'updated_at', 'version']);
        unindexDiscuss(reply);
        ctx.rest({ 'id': id });
    },

    'POST /api/topics/:id/delete': async (ctx, next) => {
        /**
         * Delete a topic by its id.
         * 
         * @name Delete Topic
         * @param {string} id - The id of the topic.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        ctx.checkPermission(constants.role.EDITOR);
        let
            id = ctx.request.params.id,
            topic = await getTopic(id),
            reply_ids = await warp.$query('select id from replies where topic_id=?', [id]);
        await topic.destroy();
        await Reply.$update('delete from replies where topic_id=?', [id]);
        await Board.$update('update boards set topics = topics - 1 where id=?', [topic.board_id]);
        unindexDiscuss(topic);
        unindexDiscussByIds(reply_ids);
        ctx.rest({ 'id': id });
    },

    'POST /api/topics/:id/replies': async (ctx, next) => {
        /**
         * Create a reply to a topic.
         * 
         * @param {string} id: The id of topic.
         * @param {string} content: The content of reply.
         * @return {object} The reply object.
         */
        ctx.checkPermission(constants.role.SUBSCRIBER);
        ctx.validate('createReply');
        var data = ctx.request.body;
        ctx.rest(await createReply(ctx.state.__user__, id, data));
    }
};
