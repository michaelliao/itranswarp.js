// test article api:

var fs = require('fs');

var
    _ = require('lodash'),
    async=require('async'),
    should = require('should');

var remote = require('./_test');

var log = console.log;

describe('#articles', function() {

    var category = null;

    before(remote.setup);

    before(function(done) {
        remote.post(remote.admin, '/api/categories', {
            name: 'Article Category'
        }, function(r) {
            should(r).be.ok;
            r.name.should.equal('Article Category');
            r.id.should.be.ok.and.have.lengthOf(50);
            category = r;
            done();
        });
    });

    describe('#api', function() {

        it('should get empty articles', function(done) {
            remote.get(remote.guest, '/api/articles', null, function(r) {
                r.articles.length.should.equal(0);
                done();
            });
        });

        it('create and update article by editor', function(done) {
            // create article:
            remote.post(remote.editor, '/api/articles', {
                category_id: category.id,
                name: 'Test Article   ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: '  Long content... '
            }, function(r1) {
                r1.category_id.should.equal(category.id);
                r1.name.should.equal('Test Article');
                r1.description.should.equal('blablabla\nhaha...');
                r1.tags.should.equal('aaa,BBB,ccc');
                r1.content.should.equal('Long content...');
                r1.cover_id.should.equal('');

                // update article:
                remote.post(remote.editor, '/api/articles/' + r1.id, {
                    name: 'Name Changed  ',
                    content: 'Changed!'
                }, function(r2) {
                    r2.name.should.equal('Name Changed');
                    r2.content.should.equal('Changed!');
                    // query:
                    remote.get(remote.guest, '/api/articles/' + r1.id, null, function(r3) {
                        r3.name.should.equal(r2.name);
                        r3.content.should.equal(r2.content);
                        // not updated:
                        r3.tags.should.equal(r1.tags);
                        r3.description.should.equal(r1.description);
                        done();
                    });
                });
            });
        });

        it('create article with cover by editor', function(done) {
            // create article:
            remote.post(remote.editor, '/api/articles', {
                category_id: category.id,
                name: ' Test Article With Cover  ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' cover,\n CoveR',
                content: '  Article comes with cover...   ',
                file: remote.createReadStream('./test/res-image.jpg')
            }, function(r) {
                r.category_id.should.equal(category.id);
                r.name.should.equal('Test Article With Cover');
                r.description.should.equal('blablabla\nhaha...');
                r.tags.should.equal('cover');
                r.content.should.equal('Article comes with cover...');
                r.cover_id.should.be.ok;
                // check cover:
                remote.get(remote.guest, '/api/attachments/' + r.cover_id, null, function(r2) {
                    r2.id.should.equal(r.cover_id);
                    r2.name.should.equal(r.name);
                    r2.size.should.equal(346158);
                    // download image:
                    remote.download('/files/attachments/' + r2.id, function(content_type, content_length, content) {
                        content_type.should.equal('image/jpeg');
                        content_length.should.equal(346158);
                        // update cover:
                        remote.post(remote.editor, '/api/articles/' + r.id, {
                            name: 'Cover changed!',
                            file: remote.createReadStream('./test/res-image-2.jpg')
                        }, function(r3) {
                            // check cover is ok:
                            r3.cover_id.should.not.equal(r.cover_id);
                            remote.get(remote.guest, '/api/attachments/' + r3.cover_id, null, function(r4) {
                                r4.id.should.equal(r3.cover_id);
                                // check article cover changed:
                                remote.get(remote.guest, '/api/articles/' + r.id, null, function(r5) {
                                    r5.cover_id.should.equal(r4.id);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('create article with wrong parameter by editor', function(done) {
            var create_missing_params = function(pname) {
                var r = {
                    name: 'Test',
                    description: 'blablabla...',
                    category_id: category.id,
                    tags: 'tag1,tag2,tag3',
                    content: 'a long content...'
                };
                delete r[pname];
                return r;
            };
            var tests = _.map(['name', 'category_id', 'content'], function(param) {
                return function(callback) {
                    remote.post(remote.editor, '/api/articles', create_missing_params(param), function(r) {
                        r.error.should.equal('parameter:invalid');
                        r.data.should.equal(param);
                        r.message.should.be.ok;
                        callback(null);
                    });
                };
            });
            async.series(tests, function(err, results) {
                done();
            });
        });

        it('create and delete article by editor', function(done) {
            // create article:
            remote.post(remote.editor, '/api/articles', {
                category_id: category.id,
                name: ' To be delete...   ',
                description: '   blablabla\nhaha...  \n   ',
                content: '  Long long long content... '
            }, function(r1) {
                r1.category_id.should.equal(category.id);
                r1.name.should.equal('To be delete...');
                // delete article:
                remote.post(remote.editor, '/api/articles/' + r1.id + '/delete', null, function(r2) {
                    r2.id.should.equal(r1.id);
                    // query:
                    remote.get(remote.guest, '/api/articles/' + r1.id, null, function(r3) {
                        r3.error.should.equal('resource:notfound');
                        r3.data.should.equal('Article');
                        done();
                    });
                });
            });
        });
    });
});
