'use strict';

// discuss api

const
    db = require('../db'),
    md = require('../md'),
    api = require('../api'),
    cache = require('../cache'),
    helper = require('../helper'),
    logger = require('../logger'),
    search = require('../search/search'),
    constants = require('../constants'),
    userApi = require('./userApi'),
    settingApi = require('./settingApi'),
    Board = db.Board,
    Topic = db.Topic,
    Reply = db.Reply,
    nextId = db.nextId;

function indexDiscuss(r) {
    // var doc = {
    //     type: 'discuss',
    //     id: r.id,
    //     tags: r.tags || '',
    //     name: r.name,
    //     description: '',
    //     content: helper.html2text(r.content),
    //     created_at: r.created_at,
    //     updated_at: r.updated_at,
    //     url: '/discuss/' + (r.topic_id ? 'topics/' + r.topic_id + '/find/' + r.id : r.board_id + '/' + r.id),
    //     upvotes: 0
    // };
    // process.nextTick(() => {
    //     search.engine.index(doc);
    // });
}

function unindexDiscuss(r) {
    // process.nextTick(() => {
    //     search.engine.unindex({
    //         id: r.id
    //     });
    // });
}

function unindexDiscussByIds(ids) {
    // process.nextTick(() => {
    //     var
    //         arr = ids,
    //         fn = () => {
    //             if (arr.length > 0) {
    //                 if (arr.length > 10) {
    //                     search.engine.unindex(arr.splice(arr.length - 10, 10));
    //                 } else {
    //                     search.engine.unindex(arr.splice(0, arr.length));
    //                 }
    //                 setTimeout(fn, 500);
    //             }
    //         };
    //     fn();
    // });
}

async function checkSpam(input) {
    let
        i, sum = 0,
        website = await settingApi.getWebsiteSettings(),
        antispam = website.antispam || '';
    if (antispam === '') {
        return false;
    }
    let
        keywords = antispam.split(/\,/),
        stopwords = /[\`\~\!\@\#\$\%\^\&\*\(\)\_\+\-\=\{\}\[\]\:\;\<\>\,\.\?\/\|\\\s\"\'\r\n\t\　\～\·\！\¥\…\（\）\—\、\；\：\。\，\《\》\【\】\「\」\“\”\‘\’\？]/g,
        s = input.replace(stopwords, '').toLowerCase();
    for (i = 0; i < keywords.length; i++) {
        if (s.indexOf(keywords[i]) >= 0) {
            sum++;
        }
    }
    return sum > 0 && sum > keywords.length / 4;
}

async function getBoard(id) {
    let
        boards = await getBoards(),
        filtered = boards.filter((board) => {
            return board.id === id;
        });
    if (filtered.length === 0) {
        throw api.notFound('Board');
    }
    return filtered[0];
}

async function getBoardByTag(tag) {
    let
        boards = await getBoards(),
        filtered = boards.filter((board) => {
            return board.tag === tag;
        });
    if (filtered.length === 0) {
        throw api.notFound('Board');
    }
    return filtered[0];
}

async function getBoards() {
    return await cache.get(constants.cache.BOARDS, async () => {
        return await Board.findAll({
            order: 'display_order'
        });
    });
}

async function _lockBoard(id, locked) {
    let board = await Board.findById(id);
    board.locked = locked;
    await board.save();
    return board;
}

async function getTopic(id) {
    let topic = await Topic.findById(id);
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
        order: 'id DESC',
        offset: page.offset,
        limit: page.limit
    });
}

async function getRecentTopics(max) {
    let topics = await Topic.findAll({
        attributes: {
            exclude: ['content']
        },
        order: 'updated_at DESC',
        offset: 0,
        limit: max
    });
    await userApi.bindUsers(topics);
    return topics;
}

async function deleteTopic(id) {
    let
        topic = await getTopic(id),
        reply_ids = await Reply.findAll({
            attributes: ['id'],
            where: {
                topic_id: id
            }
        }).map((r) => {
            return r.id;
        });
    await topic.destroy();
    await Reply.destroy({
        where: {
            topic_id: id
        }
    });
    // set topics - 1:
    await Board.update({
        topics: db.sequelize.literal('topics - 1')
    }, {
            where: {
                id: topic.board_id
            }
        });
    unindexDiscuss(topic);
    unindexDiscussByIds(reply_ids);
}

async function deleteReply(id) {
    let reply = await Reply.findById(id);
    if (reply === null) {
        throw api.notFound('Reply');
    }
    reply.deleted = true;
    await reply.save();
    unindexDiscuss(reply);
}

async function getTopicsByUser(user_id, max = 20) {
    return await Topic.findAll({
        attributes: {
            exclude: ['content']
        },
        where: {
            'user_id': user_id
        },
        order: 'created_at DESC',
        limit: max
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
    let num = await Reply.count({
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
    let num = await Reply.count({
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
    let topic = await getTopic(topic_id);
    if (topic.locked) {
        throw api.conflictError('Topic', 'Topic is locked.');
    }
    if (await checkSpam(data.content)) {
        await userApi.lockUser(user.id, 5000000000000);
        throw api.notAllowed('Bad request');
    }
    let reply = await Reply.create({
        topic_id: topic_id,
        user_id: user.id,
        content: md.ugcMarkdownToHtml(data.content)
    });
    await Topic.update({
        replies: db.sequelize.literal('replies + 1'),
        updated_at: Date.now()
    }, {
            where: {
                id: topic_id
            }
        });
    reply.name = 'Re:' + topic.name;
    indexDiscuss(reply);
    delete reply.name;
    if (topic.ref_id) {
        await cache.remove('REF-TOPICS-' + topic.ref_id);
    }
    return reply;
}

async function createTopic(user, board_id, ref_type, ref_id, data) {
    // spam check:
    if (await checkSpam(data.name + data.content)) {
        await userApi.lockUser(user.id, 5000000000000);
        throw api.notAllowed('Bad request');
    }
    let
        board = await getBoard(board_id),
        topic = await Topic.create({
            board_id: board_id,
            user_id: user.id,
            ref_type: ref_type,
            ref_id: ref_id,
            name: data.name.trim(),
            tags: (data.tags || '').trim(),
            content: md.ugcMarkdownToHtml(data.content),
            replies: 0
        });
    await Board.update({
        topics: db.sequelize.literal('topics + 1')
    }, {
            where: {
                id: board_id
            }
        });
    indexDiscuss(topic);
    if (ref_id) {
        await cache.remove('REF-TOPICS-' + ref_id);
    }
    return topic;
}

async function loadTopicsByRefWithCache(ref_id, page) {
    if (page.index === 1) {
        let key = 'REF-TOPICS-' + ref_id;
        return await cache.get(key, async () => {
            return await loadTopicsByRef(ref_id, page);
        });
    }
    return await loadTopicsByRef(ref_id, page);
}

async function loadTopicsByRef(ref_id, page) {
    let topics = await getTopicsByRef(ref_id, page);
    await userApi.bindUsers(topics);
    for (let i = 0; i < topics.length; i++) {
        await bindReplies(topics[i]);
    }
    return topics;
}

async function bindReplies(topic) {
    let key = 'REPLIES-' + topic.id + '_' + topic.version;
    topic.replies = await cache.get(key, async () => {
        let replies = await getFirstReplies(topic.id, 10);
        await userApi.bindUsers(replies);
        return replies;
    });
}

module.exports = {

    getNavigationMenus: () => {
        return [{
            name: 'Discuss',
            url: '/discuss'
        }];
    },

    createTopic: createTopic,

    getBoard: getBoard,

    getBoardByTag: getBoardByTag,

    getBoards: getBoards,

    getTopic: getTopic,

    getTopics: getTopics,

    getTopicsByUser: getTopicsByUser,

    getRecentTopics: getRecentTopics,

    getTopicsByRef: getTopicsByRef,

    getReplies: getReplies,

    getFirstReplies: getFirstReplies,

    getReplyPageIndex: getReplyPageIndex,

    'GET /api/ref/:id/topics': async (ctx, next) => {
        /**
         * Get topics by ref id
         */
        let
            id = ctx.params.id,
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
        let
            data = ctx.request.body,
            num = await Board.max('display_order'),
            board = await Board.create({
                name: data.name.trim(),
                tag: data.tag.trim(),
                description: data.description.trim(),
                display_order: isNaN(num) ? 0 : (num + 1),
                topics: 0,
                locked: false
            });
        await cache.remove(constants.cache.BOARDS);
        ctx.rest(board);
    },

    'GET /api/boards/:id': async (ctx, next) => {
        let
            id = ctx.params.id,
            board = await getBoard(id);
        ctx.rest(board);
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
        let
            id = ctx.params.id,
            data = ctx.request.body,
            board = await Board.findById(id);
        if (data.name) {
            board.name = data.name.trim();
        }
        if (data.description) {
            board.description = data.description.trim();
        }
        if (data.tag) {
            board.tag = data.tag.trim();
        }
        await board.save();
        await cache.remove(constants.cache.BOARDS);
        ctx.rest(board);
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
        let
            data = ctx.request.body,
            ids = data.ids,
            boards = await Board.findAll();
        if (ids.length !== boards.length) {
            throw api.invalidParam('ids', 'Invalid id list.');
        }
        boards.forEach((board) => {
            let pos = ids.indexOf(board.id);
            if (pos === (-1)) {
                throw api.invalidParam('ids', 'Invalid id list.');
            }
            board.display_order = pos;
        });
        for (let i = 0; i < boards.length; i++) {
            await boards[i].save();
        }
        await cache.remove(constants.cache.BOARDS);
        ctx.rest({
            boards: boards
        });
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
        let
            id = ctx.params.id,
            r = await _lockBoard(id, true);
        await cache.remove(constants.cache.BOARDS);
        ctx.rest(r);
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
        let
            id = ctx.params.id,
            r = await _lockBoard(id, false);
        await cache.remove(constants.cache.BOARDS);
        ctx.rest(r);
    },

    'GET /api/boards/:id/topics': async (ctx, next) => {
        /**
         * Get topics by page. NOTE: the returned topics do not have 'content'.
         */
        let
            board_id = ctx.params.id,
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
            board_id = ctx.params.id,
            data = ctx.request.body,
            topic = await createTopic(ctx.state.__user__, board_id, '', '', data);
        ctx.rest(topic);
    },

    'GET /api/topics': async (ctx, next) => {
        /**
         * Get all topics.
         */
        let
            page = helper.getPage(ctx.request),
            topics = await getAllTopics(page);
        await userApi.bindUsers(topics);
        ctx.rest({
            page: page,
            topics: topics
        });
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
        await deleteTopic(ctx.params.id);
        ctx.rest({ id: ctx.params.id });
    },

    'GET /api/replies': async (ctx, next) => {
        /**
         * Get all replies by page.
         */
        ctx.checkPermission(constants.role.EDITOR);
        let
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
        await deleteReply(ctx.params.id);
        ctx.rest({ id: ctx.params.id });
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
        let
            id = ctx.params.id,
            data = ctx.request.body;
        ctx.rest(await createReply(ctx.state.__user__, id, data));
    }
};
