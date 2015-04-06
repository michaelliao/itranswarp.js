'use strict';

// test article api:

var
    _ = require('lodash'),
    async = require('async'),
    should = require('should'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#attachment', function () {

    before(remote.setup);

    describe('#api', function () {

        it('should get empty attachment', function* () {
            var atts = yield remote.$get(roles.GUEST, '/api/attachments');
            should(atts).be.ok;
            atts.attachments.should.be.an.Array.and.have.length(0);
            atts.page.total.should.equal(0);
        });

        it('create attachment failed by subscriber', function* () {
            // create attachment:
            var r = yield remote.$post(roles.SUBSCRIBER, '/api/attachments', {
                name: 'Test Image   ',
                description: '   bla bla bla...  \n   ',
                data: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldHasError(r, 'permission:denied');
        });

        it('upload image by contributor', function* () {
            var r = yield remote.$post(roles.CONTRIBUTOR, '/api/attachments', {
                name: 'Test Image   ',
                description: '   bla bla bla...  \n   ',
                data: remote.readFileSync('res-image.jpg').toString('base64')
            });
            remote.shouldNoError(r);
            r.name.should.equal('Test Image');
            r.description.should.equal('bla bla bla...');
            r.mime.should.equal('image/jpeg');
            r.width.should.equal(1280);
            r.height.should.equal(720);
            r.size.should.equal(346158);
            // get it:
            var r2 = yield remote.$get(roles.GUEST, '/api/attachments/' + r.id);
            remote.shouldNoError(r2);
            r2.name.should.equal('Test Image');
            r2.description.should.equal('bla bla bla...');
            r2.mime.should.equal('image/jpeg');
            // get all:
            var rs = yield remote.$get(roles.GUEST, '/api/attachments');
            remote.shouldNoError(rs);
            rs.page.total.should.equal(1);
            rs.attachments.should.be.an.Array.and.have.length(1);
            rs.attachments[0].id.should.equal(r.id);
            rs.attachments[0].name.should.equal('Test Image');
            rs.attachments[0].description.should.equal('bla bla bla...');
            rs.attachments[0].mime.should.equal('image/jpeg');
            // download it:
            var d = yield remote.$download('/files/attachments/' + r.id);
            remote.shouldNoError(d);
            d.statusCode.should.equal(200);
            d.headers['content-type'].should.equal('image/jpeg');
            d.headers['content-length'].should.equal('346158');
            // download 0, m, l, s:
            var d0 = yield remote.$download('/files/attachments/' + r.id + '/0');
            remote.shouldNoError(d0);
            d0.statusCode.should.equal(200);
            d0.headers['content-type'].should.equal('image/jpeg');
            d0.headers['content-length'].should.equal('346158');

            var dl = yield remote.$download('/files/attachments/' + r.id + '/l');
            remote.shouldNoError(dl);
            dl.statusCode.should.equal(200);
            dl.headers['content-type'].should.equal('image/jpeg');
            parseInt(dl.headers['content-length'], 10).should.approximately(122826, 10000);

            var dm = yield remote.$download('/files/attachments/' + r.id + '/m');
            remote.shouldNoError(dm);
            dm.statusCode.should.equal(200);
            dm.headers['content-type'].should.equal('image/jpeg');
            parseInt(dm.headers['content-length'], 10).should.approximately(45043, 1000);

            var ds = yield remote.$download('/files/attachments/' + r.id + '/s');
            remote.shouldNoError(ds);
            ds.statusCode.should.equal(200);
            ds.headers['content-type'].should.equal('image/jpeg');
            parseInt(ds.headers['content-length'], 10).should.approximately(25269, 1000);
        });

        it('upload image but says text/plain', function (done) {
            // create attachment:
            remote.post(remote.contributor, '/api/attachments?image=true', {
                name: ' Text   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/res-plain.txt')
            }, function (r) {
                should(r.error).be.ok;
                r.error.should.equal('parameter:invalid');
                r.data.should.equal('file');
                done();
            });
        });

        it('upload text file by contributor then delete', function (done) {
            // create attachment:
            remote.post(remote.contributor, '/api/attachments', {
                name: ' Text   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/res-plain.txt')
            }, function (r) {
                r.name.should.equal('Text');
                r.width.should.equal(0);
                r.height.should.equal(0);
                r.size.should.equal(25197);
                // try delete by another users:
                var tasks = _.map([roles.SUBSCRIBER, remote.editor], function (user) {
                    return function (callback) {
                        remote.post(user, '/api/attachments/' + r.id + '/delete', {}, function (r2) {
                            should(r2).be.ok;
                            should(r2.error).be.ok;
                            r2.error.should.equal('permission:denied');
                            r2.message.should.be.ok;
                            callback();
                        });
                    };
                });
                async.parallel(tasks, function (err, results) {
                    should(err===null).be.ok;
                    // delete by admin:
                    remote.post(remote.admin, '/api/attachments/' + r.id + '/delete', {}, function (r3) {
                        should(r3).be.ok;
                        should(r3.error).not.be.ok;
                        should(r3.id).be.ok;
                        r3.id.should.equal(r.id);
                        done();
                    });
                });
            });
        });

    });
});
