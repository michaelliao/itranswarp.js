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

describe('#wikis', function () {

    before(remote.setup);

    describe('#wiki-api', function () {

        it('should get empty wikis', function* () {
            var r = yield remote.$get(roles.GUEST, '/api/wikis');
            remote.shouldNoError(r);
            should(r.wikis).be.ok;
            r.wikis.should.be.an.Array.and.have.length(0);
        });

        it('create and update wiki by editor', function* () {
            // create wiki:
            var r1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
                name: 'Test Wiki   ',
                description: '   blablabla\nhaha...  \n   ',
                tag: 'abc',
                content: 'Long content...',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r1);
            r1.name.should.equal('Test Wiki');
            r1.description.should.equal('blablabla\nhaha...');
            r1.tag.should.equal('abc');
            r1.content.should.equal('Long content...');
            r1.cover_id.should.be.ok;
            r1.version.should.equal(0);

            // check image:
            var dl = yield remote.$download('/files/attachments/' + r1.cover_id + '/l');
            remote.shouldNoError(dl);
            dl.statusCode.should.equal(200);
            dl.headers['content-type'].should.equal('image/jpeg');
            parseInt(dl.headers['content-length'], 10).should.approximately(122826, 10000);

            // update wiki:
            var r2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + r1.id, {
                name: 'Name Changed  ',
                content: 'Changed!'
            });
            remote.shouldNoError(r2);
            r2.name.should.equal('Name Changed');
            r2.content.should.equal('Changed!');
            r2.version.should.equal(1);

            // query:
            var r3 = yield remote.$get(roles.GUEST, '/api/wikis/' + r1.id);
            remote.shouldNoError(r3);
            r3.name.should.equal(r2.name);
            r3.content.should.equal(r2.content);
            // not updated:
            r3.tag.should.equal(r1.tag);
            r3.description.should.equal(r1.description);

            // query all wikis:
            var r4 = yield remote.$get(roles.GUEST, '/api/wikis/');
            remote.shouldNoError(r4);
            should(r4.wikis).be.ok;
            r4.wikis.should.be.an.Array.and.have.length(1);

            var w = r4.wikis[0];
            w.name.should.equal(r3.name);
        });

        it('create wiki then change cover by editor', function* () {
            // create wiki:
            var r1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
                name: 'Test Wiki   ',
                description: '   blablabla\nhaha...  \n   ',
                tag: 'xyz',
                content: '  Long content... ',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r1);
            r1.name.should.equal('Test Wiki');
            r1.cover_id.should.be.ok;

            // update wiki:
            var r2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + r1.id, {
                name: 'Name Changed  ',
                image: remote.readFileSync('res-image-2.jpg').toString('base64')
            });
            remote.shouldNoError(r2);
            r2.name.should.equal('Name Changed');
            r2.cover_id.should.not.equal(r1.cover_id);
            r2.content.should.equal(r1.content);
            r2.version.should.equal(1);

            // check image:
            var dl = yield remote.$download('/files/attachments/' + r2.cover_id + '/l');
            remote.shouldNoError(dl);
            dl.statusCode.should.equal(200);
            dl.headers['content-type'].should.equal('image/jpeg');
            parseInt(dl.headers['content-length'], 10).should.approximately(39368, 10000);

            // upload non-image as cover:
            var r3 = yield remote.$post(roles.EDITOR, '/api/wikis/' + r1.id, {
                name: 'Name Changed Again!  ',
                image: remote.readFileSync('res-plain.txt').toString('base64')
            });
            remote.shouldHasError(r3, 'parameter:invalid', 'image');
        });

        it('create wiki and wikipage with wrong parameter by editor', function* () {
            var
                i, r, params,
                required = ['name', 'tag', 'description', 'content', 'image'],
                prepared = {
                    name: 'Test Param',
                    description: 'blablabla...',
                    tag: 'tag1',
                    content: 'a long content...',
                    image: remote.readFileSync('res-image.jpg').toString('base64')
                };
            for (i=0; i<required.length; i++) {
                params = _.clone(prepared);
                delete params[required[i]];
                r = yield remote.$post(roles.EDITOR, '/api/wikis', params);
                remote.shouldHasError(r, 'parameter:invalid', required[i]);
            }
            var w1 = yield remote.$post(roles.EDITOR, '/api/wikis', prepared);
            remote.shouldNoError(w1);
            // try create wikipage:
            var r1 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                name: 'WP',
                content: 'wiki page...'
            });
            remote.shouldHasError(r1, 'parameter:invalid', 'parent_id');
            var r2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                parent_id: remote.next_id(),
                content: 'wiki page...'
            });
            remote.shouldHasError(r2, 'parameter:invalid', 'name');
            var r3 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                parent_id: remote.next_id(),
                name: 'WP'
            });
            remote.shouldHasError(r3, 'parameter:invalid', 'content');
        });

        it('create by contributor failed', function* () {
            // create wiki:
            var r = yield remote.$post(roles.CONTRIBUTER, '/api/wikis', {
                name: ' To be delete...   ',
                tag: 'java',
                description: '   blablabla\nhaha...  \n   ',
                content: '  Long long long content... ',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldHasError(r, 'permission:denied');
        });

        it('create and delete wiki by editor', function* () {
            // create wiki:
            var r1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
                name: ' To be delete...   ',
                tag: 'java',
                description: '   blablabla\nhaha...  \n   ',
                content: '  Long long long content... ',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r1);
            r1.name.should.equal('To be delete...');

            // delete wiki:
            var r2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + r1.id + '/delete');
            remote.shouldNoError(r2);
            r2.id.should.equal(r1.id);

            // query:
            var r3 = yield remote.$get(roles.GUEST, '/api/wikis/' + r1.id);
            remote.shouldHasError(r3, 'entity:notfound', 'Wiki');
        });

        it('create wiki page, update and delete it', function* () {
            // create wiki:
            var w1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
                name: ' Test For WikiPage   ',
                tag: 'java',
                description: '   blablabla\nhaha...  \n   ',
                content: 'Long long long content... ',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(w1);

            // create wiki page:
            // w1
            // +- p1
            var p1 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                parent_id: '',
                name: 'First Wiki Page   ',
                content: 'This is a first wiki page...'
            });
            remote.shouldNoError(p1);
            p1.wiki_id.should.equal(w1.id);
            p1.parent_id.should.equal('');
            p1.display_order.should.equal(0);
            p1.name.should.equal('First Wiki Page');
            p1.content.should.equal('This is a first wiki page...');
            p1.version.should.equal(0);
            // query p1:
            var p2 = yield remote.$get(roles.EDITOR, '/api/wikis/wikipages/' + p1.id);
            remote.shouldNoError(p2);
            p2.wiki_id.should.equal(p1.wiki_id);
            p2.parent_id.should.equal(p1.parent_id);
            p2.display_order.should.equal(p1.display_order);
            p2.name.should.equal(p1.name);
            p2.content.should.equal(p1.content);
            p2.version.should.equal(0);
            // update p1:
            var p3 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p1.id, {
                name: 'Changed',
                content: 'content changed.'
            });
            remote.shouldNoError(p3);
            p3.name.should.equal('Changed');
            p3.content.should.equal('content changed.');
            // query again:
            var p4 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p1.id);
            remote.shouldNoError(p4);
            p4.wiki_id.should.equal(p3.wiki_id);
            p4.parent_id.should.equal(p3.parent_id);
            p4.display_order.should.equal(p3.display_order);
            p4.name.should.equal(p3.name);
            p4.content.should.equal(p3.content);
            p4.version.should.equal(1);
        });

        it('create wiki tree, move and try delete wiki', function* () {
            // create wiki:
            var w1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
                name: ' Tree   ',
                tag: 'wikipedia',
                description: '   blablabla\nhaha...  \n   ',
                content: 'Long long long content... ',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(w1);

            // create wiki page:
            // w1
            // +- p1
            var p1 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                parent_id: '',
                name: ' P1 - First Wiki Page   ',
                content: 'This is a first wiki page...'
            });
            remote.shouldNoError(p1);
            p1.wiki_id.should.equal(w1.id);
            p1.parent_id.should.equal('');
            p1.display_order.should.equal(0);
            p1.name.should.equal('P1 - First Wiki Page');
            p1.content.should.equal('This is a first wiki page...');

            // try delete wiki:
            var r2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/delete');
            remote.shouldHasError(r2, 'entity:conflict');

            // try create wiki page again:
            // w1
            // +- p1
            //    +- p2
            var p2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                parent_id: p1.id,
                name: 'P2',
                content: 'child wiki page...'
            });
            remote.shouldNoError(p2);
            p2.wiki_id.should.equal(w1.id);
            p2.parent_id.should.equal(p1.id);
            p2.display_order.should.equal(0);
            p2.name.should.equal('P2');
            p2.content.should.equal('child wiki page...');

            // try create wiki page under w1:
            // w1
            // +- p1
            // |  +- p2
            // +- p3
            var p3 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                parent_id: '',
                name: 'P3',
                content: 'p3'
            });
            remote.shouldNoError(p3);
            p3.wiki_id.should.equal(w1.id);
            p3.parent_id.should.equal('');
            p3.display_order.should.equal(1);
            p3.name.should.equal('P3');
            p3.content.should.equal('p3');

            // try create wiki page under p2:
            // w1
            // +- p1
            // |  +- p2
            // |     +- p4
            // +- p3
            var p4 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
                parent_id: p2.id,
                name: 'P4',
                content: 'p4'
            });
            remote.shouldNoError(p4);
            p4.wiki_id.should.equal(w1.id);
            p4.parent_id.should.equal(p2.id);
            p4.display_order.should.equal(0);
            p4.name.should.equal('P4');
            p4.content.should.equal('p4');

            // move p3 to p2 at index 0:
            // w1
            // +- p1
            // .  +- p2
            // .     +- p3 <----- move to here
            // .     +- p4
            // +. p3       <----- from here
            var np3 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p3.id + '/move', {
                parent_id: p2.id,
                index: 0
            });
            remote.shouldNoError(np3);
            np3.wiki_id.should.equal(w1.id);
            np3.parent_id.should.equal(p2.id);
            np3.display_order.should.equal(0);

            // move p4 to ROOT at index 0:
            // w1
            // +- p4 <-------- move to here
            // +- p1
            //    +- p2
            //       +- p3
            //       +. p4 <-- from here
            var np4 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p4.id + '/move', {
                parent_id: '',
                index: 0
            });
            remote.shouldNoError(np4);
            np4.wiki_id.should.equal(w1.id);
            np4.parent_id.should.equal('');
            np4.display_order.should.equal(0);

            // check p1 index:
            var np1 = yield remote.$get(roles.EDITOR, '/api/wikis/wikipages/' + p1.id);
            remote.shouldNoError(np1);
            np1.display_order.should.equal(1);

            // move p1 to p3 to make a recursive:
            // w1
            // +- p4
            // +- p1       <----- i'm to here
            //    +- p2
            //       +- p3
            //          +- <----- to here, but not allowed!
            var r4 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p1.id + '/move', {
                parent_id: p3.id,
                index: 0
            });
            remote.shouldHasError(r4, 'entity:conflict');

            // try delete p2 failed because it has p3 as child:
            var r5 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p2.id + '/delete');
            remote.shouldHasError(r5, 'entity:conflict');

            // try delete p3 ok because it has no child:
            var r6 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p3.id + '/delete');
            remote.shouldNoError(r6);
            r6.id.should.equal(p3.id);
        });
    });
});
