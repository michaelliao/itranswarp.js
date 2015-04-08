'use strict';

// test wiki api:

var
    _ = require('lodash'),
    fs = require('fs'),
    co = require('co'),
    should = require('should'),
    discussApi = require('../controllers/discussApi'),
    Page = require('../page'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#discuss', function () {

    before(remote.setup);

    describe('#discuss-api', function () {

        it('should get boards failed for no permission', function* () {
            var r = yield remote.$get(roles.CONTRIBUTER, '/api/boards');
            remote.shouldHasError(r, 'permission:denied');
        });

        it('should get empty boards', function* () {
            var r = yield remote.$get(roles.EDITOR, '/api/boards');
            remote.shouldNoError(r);
            should(r.boards).be.ok;
            r.boards.should.be.an.Array.and.have.length(0);
        });

        it('create board failed for no permission', function* () {
            var r = yield remote.$post(roles.EDITOR, '/api/boards', {
                name: 'Try create board...',
                description: 'blablabla...',
                tag: 'js'
            });
            remote.shouldHasError(r, 'permission:denied');
        });

        it('create board failed for invalid parameter', function* () {
            var r1 = yield remote.$post(roles.ADMIN, '/api/boards', {
                // tag: missing
                name: 'Try create board...',
                description: 'blablabla...',
            });
            remote.shouldHasError(r1, 'parameter:invalid', 'tag');
            var r2 = yield remote.$post(roles.ADMIN, '/api/boards', {
                tag: 'js',
                // name: missing
                description: 'blablabla...',
            });
            remote.shouldHasError(r2, 'parameter:invalid', 'name');
        });

        it('create board ok then update it', function* () {
            var r = yield remote.$post(roles.ADMIN, '/api/boards', {
                tag: 'js',
                name: 'JavaScript HOWTO',
                description: 'a javascript discuss board'
            });
            remote.shouldNoError(r);
            r.tag.should.equal('js');
            r.name.should.equal('JavaScript HOWTO');
            r.description.should.equal('a javascript discuss board');
            r.topics.should.equal(0);
            r.display_order.should.equal(0);

            // update by editor failed:
            var r2 = yield remote.$post(roles.EDITOR, '/api/boards/' + r.id, {
                tag: 'nodejs',
                name: 'try change'
            });
            remote.shouldHasError(r2, 'permission:denied');

            // update by admin ok:
            var r3 = yield remote.$post(roles.ADMIN, '/api/boards/' + r.id, {
                tag: 'nodejs',
                name: 'try change'
            });
            remote.shouldNoError(r3);
            r3.tag.should.equal('nodejs');
            r3.name.should.equal('try change');
            r3.version.should.equal(1);

            // get board:
            var r4 = yield remote.$get(roles.EDITOR, '/api/boards/' + r.id);
            remote.shouldNoError(r4);
            r4.tag.should.equal('nodejs');
            r4.name.should.equal('try change');
            r4.description.should.equal('a javascript discuss board')
            r4.topics.should.equal(0);
            r4.version.should.equal(1);
        });

        it('create topic failed for no permission', function* () {
            // prepare board:
            var b = yield remote.$post(roles.ADMIN, '/api/boards', {
                tag: 'test',
                name: 'test topic',
                description: 'test for topic'
            });
            remote.shouldNoError(b);

            // try create topic:
            var r = yield remote.$post(roles.GUEST, '/api/boards/' + b.id + '/topics', {
                name: 'try post a topic but should failed',
                content: 'not signin yet...'
            });
            remote.shouldHasError(r, 'permission:denied');
        });

        it('create topic failed for invalid parameters', function* () {
            // prepare board:
            var b = yield remote.$post(roles.ADMIN, '/api/boards', {
                tag: 'test',
                name: 'test topic parameters',
                description: 'test for topic parameters'
            });
            remote.shouldNoError(b);

            // try create topic:
            var r1 = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
                // name: missing
                content: 'not signin yet...'
            });
            remote.shouldHasError(r1, 'parameter:invalid', 'name');
            var r2 = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
                name: 'try post a topic but should failed',
                //content: missing
            });
            remote.shouldHasError(r2, 'parameter:invalid', 'content');
        });

        it('create topic ok and delete topic', function* () {
            // prepare board:
            var b = yield remote.$post(roles.ADMIN, '/api/boards', {
                tag: 'test',
                name: 'test topic ok',
                description: 'test for topic ok'
            });
            remote.shouldNoError(b);
            b.topics.should.equal(0);

            // create 11 topics:
            var i, t;
            for (i=1; i<=11; i++) {
                yield remote.$sleep(2);
                t = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
                    name: 'topic-' + i,
                    content: 'topic-' + i + ':<script>alert(x)</script>',
                    tags: 't' + i + ',T' + i
                });
                remote.shouldNoError(t);
                t.name.should.equal('topic-' + i);
                t.tags.should.equal('t' + i);
                t.content.should.equal('<p>topic-' + i + ':&lt;script&gt;alert(x)&lt;/script&gt;</p>\n');
                t.replies.should.equal(0);
            }
            // check topics number:
            var b2 = yield remote.$get(roles.EDITOR, '/api/boards/' + b.id);
            remote.shouldNoError(b2);
            b2.topics.should.equal(11);

            // query by page:
            var p1 = yield remote.$get(roles.EDITOR, '/api/boards/' + b.id + '/topics', {
                page: 1,
                size: 10
            });
            remote.shouldNoError(p1);
            p1.page.total.should.equal(11);
            p1.page.index.should.equal(1);
            p1.topics.should.be.an.Array.and.have.length(10);
            p1.topics[0].name.should.equal('topic-11');
            p1.topics[1].name.should.equal('topic-10');
            p1.topics[9].name.should.equal('topic-2');
            // page 2:
            var p2 = yield remote.$get(roles.EDITOR, '/api/boards/' + b.id + '/topics', {
                page: 2,
                size: 10
            });
            remote.shouldNoError(p2);
            p2.page.total.should.equal(11);
            p2.page.index.should.equal(2);
            p2.topics.should.be.an.Array.and.have.length(1);
            p2.topics[0].name.should.equal('topic-1');
        });

        it('create reply failed for no permission and invalid parameters', function* () {
            // prepare board:
            var b = yield remote.$post(roles.ADMIN, '/api/boards', {
                tag: 'test',
                name: 'test reply',
                description: 'test for reply'
            });
            remote.shouldNoError(b);
            // prepare topic:
            var t = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
                name: 'topic-for-reply',
                content: 'this is test topic...',
                tags: 'ttt'
            });
            remote.shouldNoError(t);

            // create reply failed for no permission:
            var r = yield remote.$post(roles.GUEST, '/api/topics/' + t.id + '/replies', {
                content: 'try reply...'
            });
            remote.shouldHasError(r, 'permission:denied');

            // create reply failed for invalid parameter:
            var r = yield remote.$post(roles.SUBSCRIBER, '/api/topics/' + t.id + '/replies', {
            });
            remote.shouldHasError(r, 'parameter:invalid', 'content');
        });

        it('create reply ok and delete reply', function* () {
            // prepare board:
            var b = yield remote.$post(roles.ADMIN, '/api/boards', {
                tag: 'test',
                name: 'test reply',
                description: 'test for reply'
            });
            remote.shouldNoError(b);
            // prepare topic:
            var t = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
                name: 'topic-for-reply',
                content: 'this is test topic...',
                tags: 'ttt'
            });
            remote.shouldNoError(t);

            // create 11 replies ok:
            var i, r;
            for (i=1; i<=11; i++) {
                yield remote.$sleep(2);
                r = yield remote.$post(roles.SUBSCRIBER, '/api/topics/' + t.id + '/replies', {
                    content: 'reply-' + i + ':<script>cannot run</script>'
                });
                remote.shouldNoError(r);
                r.topic_id.should.equal(t.id);
                r.content.should.equal('<p>reply-' + i + ':&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
            }
            // query replies:
            // page 1:
            var p1 = new Page(1, 10);
            var rs1 = yield discussApi.$getReplies(t.id, p1);
            p1.total.should.equal(12); // 1 topic + 11 replies
            rs1.should.be.an.Array.and.have.length(9); // 1 topic + 9 replies
            rs1[0].content.should.equal('<p>reply-1:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
            rs1[1].content.should.equal('<p>reply-2:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
            rs1[8].content.should.equal('<p>reply-9:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
            // page 2:
            var p2 = new Page(2, 10);
            var rs2 = yield discussApi.$getReplies(t.id, p2);
            p2.total.should.equal(12);
            rs2.should.be.an.Array.and.have.length(2); // 2 replies
            rs2[0].content.should.equal('<p>reply-10:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
            rs2[1].content.should.equal('<p>reply-11:&lt;script&gt;cannot run&lt;/script&gt;</p>\n');
        });
    });
});
