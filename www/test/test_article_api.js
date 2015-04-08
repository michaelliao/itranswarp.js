'use strict';

// test article api:

var
    _ = require('lodash'),
    fs = require('fs'),
    co = require('co'),
    should = require('should'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#articles', function () {

    var category = null;
    var category2 = null;

    before(remote.setup);

    before(function (done) {
        co(function* () {
            category = yield remote.$post(roles.ADMIN, '/api/categories', {
                name: 'Article Category'
            });
            remote.shouldNoError(category);
            category2 = yield remote.$post(roles.ADMIN, '/api/categories', {
                name: 'Article Category 2'
            });
            remote.shouldNoError(category2);
            return 'ok';
        }).then(function (result) {
            done();
        }, function (err) {
            done(err);
        });
    });

    describe('#api', function () {

        it('should get empty articles', function* () {
            var r = yield remote.$get(roles.CONTRIBUTOR, '/api/articles');
            remote.shouldNoError(r);
            r.page.total.should.equal(0);
            r.articles.should.be.an.Array.and.have.length(0);
        });

        it('get articles failed for no permission', function* () {
            var r = yield remote.$get(roles.SUBSCRIBER, '/api/articles');
            remote.shouldHasError(r, 'permission:denied');
        });

        it('create article by contributor failed', function* () {
            // create article:
            var r1 = yield remote.$post(roles.CONTRIBUTOR, '/api/articles', {
                category_id: category.id,
                name: ' Try create Article  ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: 'Long content...',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldHasError(r1, 'permission:denied');
        });

        it('create by admin and update, delete by editor failed', function* () {
            // create article:
            var r1 = yield remote.$post(roles.ADMIN, '/api/articles', {
                category_id: category.id,
                name: ' Article 1   ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: 'Long content...',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r1);
            r1.category_id.should.equal(category.id);
            r1.name.should.equal('Article 1');
            r1.description.should.equal('blablabla\nhaha...');
            r1.tags.should.equal('aaa,BBB,ccc');
            r1.content.should.equal('Long content...');
            r1.content_id.should.be.ok;
            r1.cover_id.should.be.ok;

            // update by editor:
            var r2 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id, {
                name: 'Name Changed  ',
                content: 'Changed?'
            });
            remote.shouldHasError(r2, 'permission:denied');

            // delete by editor:
            var r3 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id + '/delete');
            remote.shouldHasError(r3, 'permission:denied');
        });

        it('create and update article by editor', function* () {
            // create article:
            var r1 = yield remote.$post(roles.EDITOR, '/api/articles', {
                category_id: category.id,
                name: 'Test Article   ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: 'Long content...',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r1);
            r1.category_id.should.equal(category.id);
            r1.name.should.equal('Test Article');
            r1.description.should.equal('blablabla\nhaha...');
            r1.tags.should.equal('aaa,BBB,ccc');
            r1.content.should.equal('Long content...');
            r1.content_id.should.be.ok;
            r1.cover_id.should.be.ok;

            // check image:
            var dl = yield remote.$download('/files/attachments/' + r1.cover_id + '/l');
            remote.shouldNoError(dl);
            dl.statusCode.should.equal(200);
            dl.headers['content-type'].should.equal('image/jpeg');
            parseInt(dl.headers['content-length'], 10).should.approximately(122826, 10000);

            // update article:
            var r2 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id, {
                name: 'Name Changed  ',
                content: 'Changed!'
            });
            remote.shouldNoError(r2);
            r2.name.should.equal('Name Changed');
            r2.content.should.equal('Changed!');
            r2.content_id.should.not.equal(r1.content_id);
            r2.cover_id.should.equal(r1.cover_id);
            r2.user_id.should.equal(r1.user_id);

            // query:
            var r3 = yield remote.$get(roles.EDITOR, '/api/articles/' + r1.id);
            r3.name.should.equal(r2.name);
            r3.content.should.equal(r2.content);
            // not updated:
            r3.tags.should.equal(r1.tags);
            r3.description.should.equal(r1.description);
        });

        it('create article then change cover', function* () {
            // create article:
            var r1 = yield remote.$post(roles.EDITOR, '/api/articles', {
                category_id: category.id,
                name: 'Before Cover Change   ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: 'Content not change...',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r1);

            // update article:
            var r2 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id, {
                image: remote.readFileSync('res-image-2.jpg').toString('base64')
            });
            remote.shouldNoError(r2);
            r2.name.should.equal('Before Cover Change');
            r2.content.should.equal('Content not change...');
            r2.content_id.should.equal(r1.content_id);
            r2.cover_id.should.not.equal(r1.cover_id);

            // check image:
            var dl = yield remote.$download('/files/attachments/' + r2.cover_id + '/l');
            remote.shouldNoError(dl);
            dl.statusCode.should.equal(200);
            dl.headers['content-type'].should.equal('image/jpeg');
            parseInt(dl.headers['content-length'], 10).should.approximately(39368, 10000);
        });

        it('create article with wrong parameter by editor', function* () {
            var
                i, r, params,
                required = ['name', 'description', 'category_id', 'content', 'image'],
                prepared = {
                    name: 'Test Params',
                    description: 'blablabla...',
                    category_id: category.id,
                    tags: 'tag1,tag2,tag3',
                    content: 'a long content...',
                    image: remote.readFileSync('res-image.jpg').toString('base64')
                };
            for (i=0; i<required.length; i++) {
                params = _.clone(prepared);
                delete params[required[i]];
                r = yield remote.$post(roles.EDITOR, '/api/articles', params);
                remote.shouldHasError(r, 'parameter:invalid', required[i]);
            }
        });

        it('create article with invalid category_id', function* () {
            var
                r,
                params = {
                    name: 'Test Params',
                    description: 'blablabla...',
                    category_id: remote.next_id(),
                    tags: 'tag1,tag2,tag3',
                    content: 'a long content...',
                    image: remote.readFileSync('res-image.jpg').toString('base64')
                };
            r = yield remote.$post(roles.EDITOR, '/api/articles', params);
            remote.shouldHasError(r, 'entity:notfound', 'Category');
        });

        it('create article with invalid image', function* () {
            var
                r,
                params = {
                    name: 'Test Params',
                    description: 'blablabla...',
                    category_id: category.id,
                    tags: 'tag1,tag2,tag3',
                    content: 'a long content...',
                    image: remote.readFileSync('res-plain.txt').toString('base64')
                };
            r = yield remote.$post(roles.EDITOR, '/api/articles', params);
            remote.shouldHasError(r, 'parameter:invalid', 'image');
        });

        it('create and delete article by editor', function* () {
            // create article:
            var r1 = yield remote.$post(roles.EDITOR, '/api/articles', {
                category_id: category.id,
                name: 'To Be Delete...   ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: 'Content not change...',
                image: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r1);

            // delete article:
            var r2 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id + '/delete');
            remote.shouldNoError(r2);
            r2.id.should.equal(r1.id);

            // query:
            var r3 = yield remote.$get(roles.EDITOR, '/api/articles/' + r1.id);
            remote.shouldHasError(r3, 'entity:notfound', 'Article');
        });
    });
});
