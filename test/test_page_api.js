// test article api:

var
    _ = require('lodash'),
    async=require('async'),
    should = require('should');

var remote = require('./_test');

var log = console.log;

describe('#pages', function() {

    before(remote.setup);

    describe('#api', function() {

        it('should get empty pages', function(done) {
            remote.get(remote.guest, '/api/pages', null, function(r) {
                r.pages.should.be.an.Array.and.have.length(0);
                done();
            });
        });

        it('create page by editor', function(done) {
            remote.post(remote.editor, '/api/pages', {
                alias: 'by-editor',
                name: 'by editor',
                content: '...'
            }, function(r) {
                r.error.should.equal('permission:denied');
                r.message.should.be.ok;
                done();
            });
        });

        it('create duplicate pages by admin', function(done) {
            // create page:
            remote.post(remote.admin, '/api/pages', {
                alias: 'Duplicate',
                name: 'test duplicate',
                draft: 'true',
                content: 'first...'
            }, function(r) {
                r.alias.should.equal('duplicate');
                r.draft.should.be.ok;
                remote.post(remote.admin, '/api/pages', {
                    alias: 'duplicate',
                    name: 'second one',
                    content: 'second...'
                },function(r2) {
                    r2.error.should.equal('parameter:invalid');
                    done();
                });
            });
        });

        it('create and update page by admin', function(done) {
            // create page:
            remote.post(remote.admin, '/api/pages', {
                alias: ' Test ',
                name: 'Test Page   ',
                tags: ' aaa,\n BBB,  \t ccc,CcC',
                content: '  Long content...\n\n '
            }, function(r) {
                r.alias.should.equal('test');
                r.draft.should.not.be.ok;
                r.name.should.equal('Test Page');
                r.tags.should.equal('aaa,BBB,ccc');
                r.content.should.equal('Long content...');
                // update name:
                remote.post(remote.admin, '/api/pages/' + r.id, {
                    name: ' Name Changed '
                }, function(r2) {
                    r2.name.should.equal('Name Changed');
                    // update text:
                    remote.post(remote.admin, '/api/pages/' + r.id, {
                        content: ' content changed.\t '
                    }, function(r3) {
                        r3.content.should.equal('content changed.');
                        // update alias:
                        remote.post(remote.admin, '/api/pages/' + r.id, {
                            alias: 'Test-2',
                            tags: ' A, B, C, c, D, '
                        }, function(r4) {
                            r4.alias.should.equal('test-2');
                            r4.tags.should.equal('A,B,C,D');
                            r4.content.should.equal(r3.content);
                            done();
                        });
                    });
                });
            });
        });

        it('create and update alias but duplicate by admin', function(done) {
            // create page:
            async.series([
                function(callback) {
                    remote.post(remote.admin, '/api/pages', {
                        alias: 'abc',
                        name: 'abc',
                        content: 'abc...'
                    }, function(r) {
                        callback(null, r);
                    });
                },
                function(callback) {
                    remote.post(remote.admin, '/api/pages', {
                        alias: 'xyz',
                        name: 'xyz',
                        content: 'xyz...'
                    }, function(r) {
                        callback(null, r);
                    });
                }
            ], function(err, results) {
                if (err) {
                    return done(err);
                }
                // try update alias:
                var id = results[0].id;
                remote.post(remote.admin, '/api/pages/' + id, {
                    alias: 'xyz'
                }, function(r) {
                    r.error.should.equal('parameter:invalid');
                    r.data.should.equal('alias');
                    done();
                });
            });
        });

        it('create page with wrong parameter by admin', function(done) {
            var create_missing_params = function(pname) {
                var r = {
                    name: 'Test',
                    alias: 'alias-x',
                    content: 'a long content...'
                };
                delete r[pname];
                return r;
            };
            var tests = _.map(['name', 'alias', 'content'], function(param) {
                return function(callback) {
                    remote.post(remote.admin, '/api/pages', create_missing_params(param), function(r) {
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
    });
});
