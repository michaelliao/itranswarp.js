'use strict';

// test wiki api:

var
    _ = require('lodash'),
    fs = require('fs'),
    co = require('co'),
    should = require('should'),
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

        it('create topic ok', function* () {
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
                t = yield remote.$post(roles.SUBSCRIBER, '/api/boards/' + b.id + '/topics', {
                    name: 'topic-' + i,
                    content: 'this is NO.' + i + ' topic...',
                    tags: 't' + i + ',T' + i
                });
                remote.shouldNoError(t);
                t.name.should.equal('topic-' + i);
                t.tags.should.equal('t' + i);
                t.content.should.equal('this is NO.' + i + ' topic...');
                t.replies.should.equal(0);
            }
        });

    });
});
