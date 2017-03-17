'use strict';

// test discuss api:

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    request = require('supertest'),
    expect = require('chai').expect,
    db = require('../db'),
    logger = require('../logger'),
    cache = require('../cache'),
    Board = db.Board,
    Topic = db.Topic,
    Reply = db.Reply,
    discussApi = require('../controllers/discussApi'),
    constants = require('../constants');

async function prepareBoard() {
    let response = await request($SERVER)
        .post('/api/boards')
        .set('Authorization', auth($ADMIN))
        .send({
            name: 'Sample board',
            tag: 'sample',
            description: 'blablabla...'
        })
        .expect('Content-Type', /application\/json/)
        .expect(200);
    expect(response.body.id).to.a('string');
    return response.body.id;
}

describe('#discuss', () => {

    before(appsetup);

    after(appclose);

    beforeEach(async () => {
        logger.info('delete all discuss...');
        await Board.destroy($ALL);
        await Topic.destroy($ALL);
        await Reply.destroy($ALL);
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.BOARDS);
    });

    it('should get empty boards', async () => {
        let response = await request($SERVER)
            .get('/api/boards')
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.boards).to.a('array').and.to.have.lengthOf(0);
    });

    it('create board failed for no permission', async () => {
        let response = await request($SERVER)
            .post('/api/boards')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'Try create board...',
                tag: 'js',
                description: 'blablabla...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create board failed for invalid parameter', async () => {
        let response;
        response = await request($SERVER)
            .post('/api/boards')
            .set('Authorization', auth($ADMIN))
            .send({
                // missing name
                tag: 'js',
                description: 'blablabla...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('name');
        response = await request($SERVER)
            .post('/api/boards')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Try create board...',
                // missing tag
                description: 'blablabla...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('tag');
    });

    it('create board ok then update it', async () => {
        let response;
        response = await request($SERVER)
            .post('/api/boards')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Try create board',
                tag: 'js',
                description: 'discuss js'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Try create board');
        expect(response.body.tag).to.equal('js');
        expect(response.body.description).to.equal('discuss js');

        let boardId = response.body.id;
        // update by editor failed:
        response = await request($SERVER)
            .post(`/api/boards/${boardId}`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'Try update board'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // update by admin ok:
        response = await request($SERVER)
            .post(`/api/boards/${boardId}`)
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Try update board'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Try update board');
        // query for check:
        response = await request($SERVER)
            .get(`/api/boards/${boardId}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(boardId);
        expect(response.body.name).to.equal('Try update board');
    });

    it('create topic failed for no permission', async () => {
        // prepare board:
        let boardId = await prepareBoard();
        // try create topic:
        let response = await request($SERVER)
            .post(`/api/boards/${boardId}/topics`)
            .send({
                name: 'try post a new topic but faied',
                content: 'not signin yet...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create topic failed for invalid parameters', async () => {
        // prepare board:
        let boardId = await prepareBoard();
        // try create topic:
        let response;
        response = await request($SERVER)
            .post(`/api/boards/${boardId}/topics`)
            .set('Authorization', auth($SUBS))
            .send({
                name: ' ',
                content: 'bad param!'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('name');

        response = await request($SERVER)
            .post(`/api/boards/${boardId}/topics`)
            .set('Authorization', auth($SUBS))
            .send({
                name: 'try post a new topic but faied',
                content: '  \n  '
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('content');
    });
    //     // prepare board:
    //     var b = yield remote.$post(roles.ADMIN, '/api/boards', {
    //         tag: 'test',
    //         name: 'test topic parameters',
    //         description: 'test for topic parameters'
    //     });
    //     remote.shouldNoError(b);

    //     // try create topic:
    //     var r1 = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
    //         // name: missing
    //         content: 'not signin yet...'
    //     });
    //     remote.shouldHasError(r1, 'parameter:invalid', 'name');
    //     var r2 = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
    //         name: 'try post a topic but should failed',
    //         //content: missing
    //     });
    //     remote.shouldHasError(r2, 'parameter:invalid', 'content');
    // });

    // it('create topic ok and delete topic', async () => {
    //     // prepare board:
    //     var b = yield remote.$post(roles.ADMIN, '/api/boards', {
    //         tag: 'test',
    //         name: 'test topic ok',
    //         description: 'test for topic ok'
    //     });
    //     remote.shouldNoError(b);
    //     b.topics.should.equal(0);

    //     // create 11 topics:
    //     var i, t;
    //     for (i=1; i<=11; i++) {
    //         yield remote.$sleep(2);
    //         t = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
    //             name: 'topic-' + i,
    //             content: 'topic-' + i + ':<script>alert(x)</script>',
    //             tags: 's' + i
    //         });
    //         remote.shouldNoError(t);
    //         t.name.should.equal('topic-' + i);
    //         t.tags.should.equal('s' + i);
    //         t.content.should.equal('<p>topic-' + i + ':&lt;script&gt;alert(x)&lt;/script&gt;</p>\n');
    //         t.replies.should.equal(0);
    //     }
    //     // check topics number:
    //     var b2 = yield remote.$get(roles.EDITOR, '/api/boards/' + b.id);
    //     remote.shouldNoError(b2);
    //     b2.topics.should.equal(11);

    //     // query by page:
    //     var p1 = yield remote.$get(roles.EDITOR, '/api/boards/' + b.id + '/topics', {
    //         page: 1,
    //         size: 10
    //     });
    //     remote.shouldNoError(p1);
    //     p1.page.total.should.equal(11);
    //     p1.page.index.should.equal(1);
    //     p1.topics.should.be.an.Array.and.have.length(10);
    //     p1.topics[0].name.should.equal('topic-11');
    //     p1.topics[1].name.should.equal('topic-10');
    //     p1.topics[9].name.should.equal('topic-2');
    //     // page 2:
    //     var p2 = yield remote.$get(roles.EDITOR, '/api/boards/' + b.id + '/topics', {
    //         page: 2,
    //         size: 10
    //     });
    //     remote.shouldNoError(p2);
    //     p2.page.total.should.equal(11);
    //     p2.page.index.should.equal(2);
    //     p2.topics.should.be.an.Array.and.have.length(1);
    //     p2.topics[0].name.should.equal('topic-1');
    // });

    // it('create reply failed for no permission and invalid parameters', async () => {
    //     // prepare board:
    //     var b = yield remote.$post(roles.ADMIN, '/api/boards', {
    //         tag: 'test',
    //         name: 'test reply',
    //         description: 'test for reply'
    //     });
    //     remote.shouldNoError(b);
    //     // prepare topic:
    //     var t = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
    //         name: 'topic-for-reply',
    //         content: 'this is test topic...',
    //         tags: 'ttt'
    //     });
    //     remote.shouldNoError(t);

    //     // create reply failed for no permission:
    //     var r = yield remote.$post(roles.GUEST, '/api/topics/' + t.id + '/replies', {
    //         content: 'try reply...'
    //     });
    //     remote.shouldHasError(r, 'permission:denied');

    //     // create reply failed for invalid parameter:
    //     var r = yield remote.$post(roles.SUBSCRIBER, '/api/topics/' + t.id + '/replies', {
    //     });
    //     remote.shouldHasError(r, 'parameter:invalid', 'content');
    // });

    // it('create reply ok and delete reply', async () => {
    //     // prepare board:
    //     var b = yield remote.$post(roles.ADMIN, '/api/boards', {
    //         tag: 'test',
    //         name: 'test reply',
    //         description: 'test for reply'
    //     });
    //     remote.shouldNoError(b);
    //     // prepare topic:
    //     var t = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
    //         name: 'topic-for-reply',
    //         content: 'this is test topic...',
    //         tags: 'ttt'
    //     });
    //     remote.shouldNoError(t);

    //     // create 11 replies ok:
    //     var i, r;
    //     for (i=1; i<=11; i++) {
    //         yield remote.$sleep(2);
    //         r = yield remote.$post(roles.SUBSCRIBER, '/api/topics/' + t.id + '/replies', {
    //             content: 'reply-' + i + ':<script>cannot run</script>'
    //         });
    //         remote.shouldNoError(r);
    //         r.topic_id.should.equal(t.id);
    //         r.content.should.equal('<p>reply-' + i + ':&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
    //     }
    //     // query replies:
    //     // page 1:
    //     var p1 = new Page(1, 10);
    //     var rs1 = yield discussApi.$getReplies(t.id, p1);
    //     p1.total.should.equal(12); // 1 topic + 11 replies
    //     rs1.should.be.an.Array.and.have.length(9); // 1 topic + 9 replies
    //     rs1[0].content.should.equal('<p>reply-1:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
    //     rs1[1].content.should.equal('<p>reply-2:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
    //     rs1[8].content.should.equal('<p>reply-9:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
    //     // page 2:
    //     var p2 = new Page(2, 10);
    //     var rs2 = yield discussApi.$getReplies(t.id, p2);
    //     p2.total.should.equal(12);
    //     rs2.should.be.an.Array.and.have.length(2); // 2 replies
    //     rs2[0].content.should.equal('<p>reply-10:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
    //     rs2[1].content.should.equal('<p>reply-11:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
    // });
});
