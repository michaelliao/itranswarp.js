// test article api:

var
    async=require('async'),
    should = require('should');

var remote = require('./_test');

var log = console.log;

describe('#attachment', function() {

    before(remote.setup);

    describe('#api', function() {

        it('should get empty attachment', function(done) {
            remote.get(remote.guest, '/api/attachments', null, function(r) {
                r.attachments.should.be.an.Array.and.have.length(0);
                done();
            });
        });

        it('create attachment by subscriber', function(done) {
            // create attachment:
            remote.post(remote.subscriber, '/api/attachments', {
                name: 'Test Image   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/test-image.jpg')
            }, function(r) {
                r.error.should.equal('permission:denied');
                r.message.should.be.ok;
                done();
            });
        });

        it('upload image by contributor', function(done) {
            // create attachment:
            remote.post(remote.contributor, '/api/attachments', {
                name: 'Test Image   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/test-image.jpg')
            }, function(r) {
                r.name.should.equal('Test Image');
                r.width.should.equal(1366);
                r.height.should.equal(768);
                r.size.should.equal(274692);
                var atta_id = r.id;
                async.series([
                    function(callback) {
                        remote.get(remote.guest, '/api/attachments/' + atta_id, null, function(r2) {
                            r2.id.should.equal(r.id);
                            r2.name.should.equal(r.name);
                            r2.size.should.equal(r.size);
                            callback(null, 'ok');
                        });
                    },
                    function(callback) {
                        remote.get(remote.guest, '/api/attachments', null, function(r2) {
                            r2.attachments.should.be.an.Array.and.have.length(1);
                            r2.attachments[0].id.should.equal(r.id);
                            callback(null, 'ok');
                        });
                    },
                    function(callback) {
                        remote.download('/files/attachments/' + atta_id, function(content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            content_length.should.equal(274692);
                            callback(null, 'ok');
                        });
                    },
                    function(callback) {
                        remote.download('/files/attachments/' + atta_id + '/l', function(content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            callback(null, 'ok');
                        });
                    },
                    function(callback) {
                        remote.download('/files/attachments/' + atta_id + '/m', function(content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            callback(null, 'ok');
                        });
                    },
                    function(callback) {
                        remote.download('/files/attachments/' + atta_id + '/s', function(content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            callback(null, 'ok');
                        });
                    },
                ], function(err, results) {
                    should(err).not.be.ok;
                    done();
                });
            });
        });

        it('upload text file by contributor', function(done) {
            // create attachment:
            remote.post(remote.contributor, '/api/attachments', {
                name: ' Text   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/test-plain.txt')
            }, function(r) {
                r.name.should.equal('Text');
                r.width.should.equal(0);
                r.height.should.equal(0);
                r.size.should.equal(25197);
                done();
            });
        });

    });
});
