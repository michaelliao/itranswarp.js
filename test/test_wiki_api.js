// test wiki api:

var fs = require('fs');

var
    _ = require('lodash'),
    async=require('async'),
    should = require('should');

var remote = require('./_test');

var log = console.log;

describe('#wikis', function() {

    before(remote.setup);

    describe('#getwikis', function() {

        it('should get empty wikis', function(done) {
            remote.get(remote.guest, '/api/wikis', null, function(r) {
                r.wikis.length.should.equal(0);
                done();
            });
        });

        it('create and update wiki by editor', function(done) {
            // create wiki:
            remote.post(remote.editor, '/api/wikis', {
                name: 'Test Wiki   ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: '  Long content... '
            }, function(r1) {
                r1.name.should.equal('Test Wiki');
                r1.description.should.equal('blablabla\nhaha...');
                r1.tags.should.equal('aaa,BBB,ccc');
                r1.content.should.equal('Long content...');
                r1.cover_id.should.equal('');

                // update wiki:
                remote.post(remote.editor, '/api/wikis/' + r1.id, {
                    name: 'Name Changed  ',
                    content: 'Changed!'
                }, function(r2) {
                    r2.name.should.equal('Name Changed');
                    r2.content.should.equal('Changed!');
                    // query:
                    remote.get(remote.guest, '/api/wikis/' + r1.id, null, function(r3) {
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

        it('create wiki with cover by editor', function(done) {
            // create wiki:
            remote.post(remote.editor, '/api/wikis', {
                name: ' Test Wiki With Cover  ',
                description: '   blablabla\nhaha...  \n   ',
                tags: ' cover,\n CoveR',
                content: '  Wiki comes with cover...   ',
                file: remote.createReadStream('./test/res-image.jpg')
            }, function(r) {
                r.name.should.equal('Test Wiki With Cover');
                r.description.should.equal('blablabla\nhaha...');
                r.tags.should.equal('cover');
                r.content.should.equal('Wiki comes with cover...');
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
                        remote.post(remote.editor, '/api/wikis/' + r.id, {
                            name: 'Cover changed!',
                            file: remote.createReadStream('./test/res-image-2.jpg')
                        }, function(r3) {
                            // check cover is ok:
                            r3.cover_id.should.not.equal(r.cover_id);
                            remote.get(remote.guest, '/api/attachments/' + r3.cover_id, null, function(r4) {
                                r4.id.should.equal(r3.cover_id);
                                // check article cover changed:
                                remote.get(remote.guest, '/api/wikis/' + r.id, null, function(r5) {
                                    r5.cover_id.should.equal(r4.id);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('create wiki with wrong parameter by editor', function(done) {
            var create_missing_params = function(pname) {
                var r = {
                    name: 'Test',
                    description: 'blablabla...',
                    tags: 'tag1,tag2,tag3',
                    content: 'a long content...'
                };
                delete r[pname];
                return r;
            };
            var tests = _.map(['name', 'description', 'content'], function(param) {
                return function(callback) {
                    remote.post(remote.editor, '/api/wikis', create_missing_params(param), function(r) {
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

        it('create by contributor', function(done) {
            // create wiki:
            remote.post(remote.contributor, '/api/wikis', {
                name: ' To be delete...   ',
                description: '   blablabla\nhaha...  \n   ',
                content: '  Long long long content... '
            }, function(r) {
                should(r.error).be.ok;
                r.error.should.equal('permission:denied');
                done();
            });
        });

        it('create and delete wiki by editor', function(done) {
            // create wiki:
            remote.post(remote.editor, '/api/wikis', {
                name: ' To be delete...   ',
                description: '   blablabla\nhaha...  \n   ',
                content: '  Long long long content... '
            }, function(r1) {
                r1.name.should.equal('To be delete...');
                // delete article:
                remote.post(remote.editor, '/api/wikis/' + r1.id + '/delete', null, function(r2) {
                    r2.id.should.equal(r1.id);
                    // query:
                    remote.get(remote.guest, '/api/wikis/' + r1.id, null, function(r3) {
                        r3.error.should.equal('resource:notfound');
                        r3.data.should.equal('Wiki');
                        done();
                    });
                });
            });
        });

        it('create wikipage and try delete wiki', function(done) {
            // create wiki:
            remote.post(remote.editor, '/api/wikis', {
                name: ' Tree   ',
                description: '   blablabla\nhaha...  \n   ',
                content: '  Long long long content... '
            }, function(w1) {
                // create wiki page:
                // w1
                // +- p1
                remote.post(remote.editor, '/api/wikis/' + w1.id + '/wikipages', {
                    parent_id: 'ROOT',
                    name: ' P1 - First Wiki Page   ',
                    content: ' This is a first wiki page...   '
                }, function(p1) {
                    should(p1.error).not.be.ok;
                    p1.wiki_id.should.equal(w1.id);
                    p1.parent_id.should.equal('');
                    p1.display_order.should.equal(0);
                    p1.name.should.equal('P1 - First Wiki Page');
                    p1.content.should.equal('This is a first wiki page...');
                    // try delete wiki:
                    remote.post(remote.editor, '/api/wikis/' + w1.id + '/delete', {}, function(r2) {
                        should(r2.error).be.ok;
                        r2.error.should.equal('resource:conflict');
                        // try create wiki page again:
                        // w1
                        // +- p1
                        //    +- p2
                        remote.post(remote.editor, '/api/wikis/' + w1.id + '/wikipages', {
                            parent_id: p1.id,
                            name: 'P2',
                            content: 'child wiki page...\n\n'
                        }, function(p2) {
                            should(p2.error).not.be.ok;
                            p2.wiki_id.should.equal(w1.id);
                            p2.parent_id.should.equal(p1.id);
                            p2.name.should.equal('P2');
                            p2.content.should.equal('child wiki page...');
                            // try create wiki page under w1:
                            // w1
                            // +- p1
                            // |  +- p2
                            // +- p3
                            remote.post(remote.editor, '/api/wikis/' + w1.id + '/wikipages', {
                                parent_id: 'ROOT',
                                name: 'P3',
                                content: 'p3'
                            }, function(p3) {
                                should(p3.error).not.be.ok;
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
                                remote.post(remote.editor, '/api/wikis/' + w1.id + '/wikipages', {
                                    parent_id: p2.id,
                                    name: 'P4',
                                    content: 'p4'
                                }, function(p4) {
                                    should(p4.error).not.be.ok;
                                    p4.wiki_id.should.equal(w1.id);
                                    p4.parent_id.should.equal(p2.id);
                                    p4.display_order.should.equal(0);
                                    p4.name.should.equal('P4');
                                    p4.content.should.equal('p4');
                                    // move p3 to p2 at index 0:
                                    // w1
                                    // +- p1
                                    //    +- p2
                                    //       +- p3 <----- move to here
                                    //       +- p4
                                    remote.post(remote.editor, '/api/wikis/wikipages/' + p3.id + '/move/' + p2.id, {
                                        index: 0
                                    }, function(np3) {
                                        should(np3.error).not.be.ok;
                                        np3.wiki_id.should.equal(w1.id);
                                        np3.parent_id.should.equal(p2.id);
                                        np3.display_order.should.equal(0);
                                        // move p4 to ROOT at index 0:
                                        // w1
                                        // +- p4 <----- move to here
                                        // +- p1
                                        //    +- p2
                                        //       +- p3
                                        remote.post(remote.editor, '/api/wikis/wikipages/' + p4.id + '/move/ROOT', {
                                            index: 0
                                        }, function(np4) {
                                            should(np4.error).not.be.ok;
                                            np4.wiki_id.should.equal(w1.id);
                                            np4.parent_id.should.equal('');
                                            np4.display_order.should.equal(0);
                                            // move p1 to p3 to make a recursive:
                                            // w1
                                            // +- p4
                                            // +- p1       <----- i'm to here
                                            //    +- p2
                                            //       +- p3
                                            //          +- <----- to here, but not allowed!
                                            remote.post(remote.editor, '/api/wikis/wikipages/' + p1.id + '/move/' + p3.id, {
                                                index: 0
                                            }, function(r4) {
                                                should(r4.error).be.ok;
                                                r4.error.should.equal('resource:conflict');
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
