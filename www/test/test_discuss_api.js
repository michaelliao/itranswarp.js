'use strict';

// test discuss api:

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    sleep = require('sleep-promise'),
    request = require('supertest'),
    expect = require('chai').expect,
    Page = require('../page'),
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

    it('create topic ok and delete topic', async () => {
        // prepare board:
        let boardId = await prepareBoard();
        // try create topic:
        let response;
        response = await request($SERVER)
            .post(`/api/boards/${boardId}/topics`)
            .set('Authorization', auth($SUBS))
            .send({
                name: ' will be deleted',
                content: 'ok!'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('will be deleted');

        let topicId = response.body.id;

        // try delete by contrib failed:
        response = await request($SERVER)
            .post(`/api/topics/${topicId}/delete`)
            .set('Authorization', auth($CONTRIB))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // try delete by editor ok:
        response = await request($SERVER)
            .post(`/api/topics/${topicId}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(topicId);
    });

    it('create topics and query', async () => {
        // prepare board:
        let boardId = await prepareBoard();
        let response;

        for (let i=1; i<=11; i++) {
            response = await request($SERVER)
                .post(`/api/boards/${boardId}/topics`)
                .set('Authorization', auth($SUBS))
                .send({
                    name: 'topic-' + i,
                    content: 'topic-' + i + ':<script>alert(x)</script>', // <- SCRIPT should be encoded!
                    tags: 's' + i
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.name).to.equal('topic-' + i);
            expect(response.body.content).to.equal('<p>topic-' + i + ':&lt;script&gt;alert(x)&lt;/script&gt;</p>\n');
            await sleep(10);
        }
        // check topic number of board:
        // NOTE: /api/boards/:id may be still cached, check db directly:
        let board = await Board.findById(boardId);
        expect(board).to.a('object');
        expect(board.topics).to.equal(11);

        // query by page:
        response = await request($SERVER)
            .get(`/api/boards/${boardId}/topics?page=1&size=10`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.page).to.a('object');
        expect(response.body.page.index).to.equal(1);
        expect(response.body.page.total).to.equal(11);
        expect(response.body.page.pages).to.equal(2);
        expect(response.body.topics).to.a('array').and.to.have.lengthOf('10');
        expect(response.body.topics[0].name).to.equal('topic-11');
        expect(response.body.topics[9].name).to.equal('topic-2');
        expect(response.body.topics[0].content).to.undefined;
        expect(response.body.topics[9].content).to.undefined;

        // query by page 2:
        response = await request($SERVER)
            .get(`/api/boards/${boardId}/topics?page=2&size=10`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.page).to.a('object');
        expect(response.body.page.index).to.equal(2);
        expect(response.body.page.total).to.equal(11);
        expect(response.body.page.pages).to.equal(2);
        expect(response.body.topics).to.a('array').and.to.have.lengthOf('1');
        expect(response.body.topics[0].name).to.equal('topic-1');
    });

    it('create reply failed for no permission and invalid parameters', async () => {
        // prepare board:
        let boardId = await prepareBoard();
        // prepare topic:
        let response = await request($SERVER)
            .post(`/api/boards/${boardId}/topics`)
            .set('Authorization', auth($SUBS))
            .send({
                name: 'test how to replies',
                content: 'topic xyz',
                tags: 'test, replies'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let topicId = response.body.id;

        // create reply failed for no permission:
        response = await request($SERVER)
            .post(`/api/topics/${topicId}/replies`)
            .send({
                content: 'reply ...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');

        // create reply with invalid parameter:
        response = await request($SERVER)
            .post(`/api/topics/${topicId}/replies`)
            .set('Authorization', auth($SUBS))
            .send({
                content: '   \n\n\n \t '
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('content');
    });

    it('create reply ok and delete reply', async () => {
        // prepare board:
        let boardId = await prepareBoard();
        // prepare topic:
        let response = await request($SERVER)
            .post(`/api/boards/${boardId}/topics`)
            .set('Authorization', auth($SUBS))
            .send({
                name: 'test how to replies',
                content: 'topic xyz',
                tags: 'test, replies'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.replies).to.equal(0);

        let topicId = response.body.id;
        // create reply ok:
        response = await request($SERVER)
            .post(`/api/topics/${topicId}/replies`)
            .set('Authorization', auth($SUBS))
            .send({
                content: 'reply <script>"ok"</script>'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.content).to.equal('<p>reply &lt;script&gt;&quot;ok&quot;&lt;/script&gt;</p>\n');

        let replyId = response.body.id;

        // query topic:
        let topic = await discussApi.getTopic(topicId);
        expect(topic.replies).to.equal(1);

        // delete reply by contrib failed:
        response = await request($SERVER)
            .post(`/api/replies/${replyId}/delete`)
            .set('Authorization', auth($CONTRIB))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');

        // delete reply by editor ok:
        response = await request($SERVER)
            .post(`/api/replies/${replyId}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(replyId);

        // query topic:
        topic = await discussApi.getTopic(topicId);
        expect(topic.replies).to.equal(1); // <- reply is still there but marked as "DELETED"
        expect(await Reply.findById(replyId)).not.to.be.null;
    });

    it('create replies and query by page, then delete whole topic', async () => {
        // prepare board:
        let boardId = await prepareBoard();
        // prepare topic:
        let response = await request($SERVER)
            .post(`/api/boards/${boardId}/topics`)
            .set('Authorization', auth($SUBS))
            .send({
                name: 'test how to replies',
                content: 'topic xyz',
                tags: 'test, replies'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.replies).to.equal(0);

        let topicId = response.body.id;

        // create 11 replies ok:
        for (let i=1; i<=11; i++) {
            response = await request($SERVER)
                .post(`/api/topics/${topicId}/replies`)
                .set('Authorization', auth($SUBS))
                .send({
                    content: 'reply-' + i + ':<script>cannot run</script>'
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            await sleep(10);
        }
        // query page 1:
        let page = new Page(1, 10);
        let replies = await discussApi.getReplies(topicId, page);

        expect(page).to.a('object');
        expect(page.index).to.equal(1);
        expect(page.total).to.equal(12);
        expect(page.pages).to.equal(2);
        expect(replies).to.a('array').and.to.have.lengthOf('9'); // <-- page 1 contains 1 topic + 9 replies
        expect(replies[0].content).to.equal('<p>reply-1:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
        expect(replies[1].content).to.equal('<p>reply-2:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
        expect(replies[8].content).to.equal('<p>reply-9:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
        // query page 2:
        page = new Page(2, 10);
        replies = await discussApi.getReplies(topicId, page);

        expect(page).to.a('object');
        expect(page.index).to.equal(2);
        expect(page.total).to.equal(12);
        expect(page.pages).to.equal(2);
        expect(replies).to.a('array').and.to.have.lengthOf('2'); // <-- page 2 contains 2 replies
        expect(replies[0].content).to.equal('<p>reply-10:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
        expect(replies[1].content).to.equal('<p>reply-11:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');

        let replyId0 = replies[0].id;
        let replyId1 = replies[1].id;

        // delete whole topic:
        response = await request($SERVER)
            .post(`/api/topics/${topicId}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        // query replies should fail:
        expect(await Reply.findById(replyId0)).to.be.null;
        expect(await Reply.findById(replyId1)).to.be.null;
    });
});
