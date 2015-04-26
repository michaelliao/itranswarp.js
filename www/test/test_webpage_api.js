'use strict';

// test webpage api:

var
    _ = require('lodash'),
    should = require('should'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#webpages', function () {

    before(remote.setup);

    describe('#api', function () {

        it('should get empty webpages', function* () {
            var r = yield remote.$get(roles.GUEST, '/api/webpages');
            remote.shouldNoError(r);
            r.webpages.should.be.an.Array.and.have.length(0);
        });

        it('create webpage failed by editor', function* () {
            var r = yield remote.$post(roles.EDITOR, '/api/webpages', {
                alias: 'by-editor',
                name: 'by editor',
                content: '...'
            });
            remote.shouldHasError(r, 'permission:denied');
        });

        it('create duplicate webpages by admin', function* () {
            // create webpage:
            var r = yield remote.$post(roles.ADMIN, '/api/webpages', {
                alias: 'duplicate',
                name: 'Test Duplicate',
                draft: true,
                content: 'first...'
            });
            remote.shouldNoError(r);
            r.alias.should.equal('duplicate');
            r.name.should.equal('Test Duplicate');
            r.draft.should.be.true;

            // create with same alias:
            var r2 = yield remote.$post(roles.ADMIN, '/api/webpages', {
                alias: 'duplicate',
                name: 'second one',
                content: 'second...'
            });
            remote.shouldHasError(r2, 'parameter:invalid', 'alias');
        });

        it('create and update webpage by admin', function* () {
            // create webpage:
            var r = yield remote.$post(roles.ADMIN, '/api/webpages', {
                alias: 'test',
                name: 'Test Webpage',
                draft: true,
                tags: 'aaa,  BBB,  \t ccc,CcC',
                content: 'Long content...'
            });
            remote.shouldNoError(r);
            r.draft.should.be.true;
            r.tags.should.equal('aaa,BBB,ccc');
            // update name:
            var r2 = yield remote.$post(roles.ADMIN, '/api/webpages/' + r.id, {
                name: ' Name Changed '
            });
            remote.shouldNoError(r2);
            r2.name.should.equal('Name Changed');
            // update text:
            var r3 = yield remote.$post(roles.ADMIN, '/api/webpages/' + r.id, {
                content: 'Content changed.'
            });
            remote.shouldNoError(r3);
            r3.content.should.equal('Content changed.');
            // update alias:
            var r4 = yield remote.$post(roles.ADMIN, '/api/webpages/' + r.id, {
                alias: 'test-2',
                tags: ' A, B, C, c, D, '
            });
            remote.shouldNoError(r4);
            r4.alias.should.equal('test-2');
            r4.tags.should.equal('A,B,C,D');
            r4.content.should.equal(r3.content);
        });

        it('create and update alias but duplicate by admin', function* () {
            // create webpage:
            var r1 = yield remote.$post(roles.ADMIN, '/api/webpages', {
                alias: 'abc',
                name: 'abc',
                content: 'abc...'
            });
            remote.shouldNoError(r1);
            var r2 = yield remote.$post(roles.ADMIN, '/api/webpages', {
                alias: 'xyz',
                name: 'xyz',
                content: 'xyz...'
            });
            remote.shouldNoError(r2);
            // try update alias 'abc' to 'xyz':
            var r = yield remote.$post(roles.ADMIN, '/api/webpages/' + r1.id, {
                alias: 'xyz'
            });
            remote.shouldHasError(r, 'parameter:invalid', 'alias');
        });

        it('create webpage with wrong parameter by admin', function* () {
            var r1 = yield remote.$post(roles.ADMIN, '/api/webpages', {
                name: 'Test',
                alias: 'alias-x',
                // content: 'missing',
                tags: 'xxx'
            });
            remote.shouldHasError(r1, 'parameter:invalid', 'content');
            var r2 = yield remote.$post(roles.ADMIN, '/api/webpages', {
                // name: 'missing',
                alias: 'alias-x',
                content: 'the content...',
                tags: 'xxx'
            });
            remote.shouldHasError(r2, 'parameter:invalid', 'name');
            var r3 = yield remote.$post(roles.ADMIN, '/api/webpages', {
                name: 'Test',
                // alias: 'missing',
                content: 'the content...',
                tags: 'xxx'
            });
            remote.shouldHasError(r3, 'parameter:invalid', 'alias');
        });
    });
});
