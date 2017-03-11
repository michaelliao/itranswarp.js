'use strict';

/**
 * Test attachment api.
 */
const
    _ = require('lodash'),
    expect = require('chai').expect,
    request = require('supertest'),
    app = require('../app'),
    helper = require('../helper'),
    constants = require('../constants'),
    attachmentApi = require('../controllers/attachmentApi');

describe('#attachment-api', () => {

    let server = app.listen(19099);

    describe('#attachment-apis', () => {

        it('should get empty attachment', async () => {
            await request(server)
                .get('/api/attachments');
            var page = helper.getPage(ctx.request);
            var atts = await attachmentApi.getAttachments();
             remote.$get(roles.GUEST, '/api/attachments');
            should(atts).be.ok;
            atts.attachments.should.be.an.Array.and.have.length(0);
            atts.page.total.should.equal(0);
        });

        // it('create attachment failed by subscriber', async () => {
        //     // create attachment:
        //     var r = yield remote.$post(roles.SUBSCRIBER, '/api/attachments', {
        //         name: 'Test Image   ',
        //         description: '   bla bla bla...  \n   ',
        //         data: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldHasError(r, 'permission:denied');
        // });

        // it('upload image by contributor', async () => {
        //     var r = yield remote.$post(roles.CONTRIBUTOR, '/api/attachments', {
        //         name: 'Test Image   ',
        //         description: '   bla bla bla...  \n   ',
        //         data: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldNoError(r);
        //     r.name.should.equal('Test Image');
        //     r.description.should.equal('bla bla bla...');
        //     r.mime.should.equal('image/jpeg');
        //     r.width.should.equal(1280);
        //     r.height.should.equal(720);
        //     r.size.should.equal(346158);
        //     // get it:
        //     var r2 = yield remote.$get(roles.GUEST, '/api/attachments/' + r.id);
        //     remote.shouldNoError(r2);
        //     r2.name.should.equal('Test Image');
        //     r2.description.should.equal('bla bla bla...');
        //     r2.mime.should.equal('image/jpeg');
        //     // get all:
        //     var rs = yield remote.$get(roles.GUEST, '/api/attachments');
        //     remote.shouldNoError(rs);
        //     rs.page.total.should.equal(1);
        //     rs.attachments.should.be.an.Array.and.have.length(1);
        //     rs.attachments[0].id.should.equal(r.id);
        //     rs.attachments[0].name.should.equal('Test Image');
        //     rs.attachments[0].description.should.equal('bla bla bla...');
        //     rs.attachments[0].mime.should.equal('image/jpeg');
        //     // download it:
        //     var d = yield remote.$download('/files/attachments/' + r.id);
        //     remote.shouldNoError(d);
        //     d.statusCode.should.equal(200);
        //     d.headers['content-type'].should.equal('image/jpeg');
        //     d.headers['content-length'].should.equal('346158');
        //     // download 0, m, l, s:
        //     var d0 = yield remote.$download('/files/attachments/' + r.id + '/0');
        //     remote.shouldNoError(d0);
        //     d0.statusCode.should.equal(200);
        //     d0.headers['content-type'].should.equal('image/jpeg');
        //     d0.headers['content-length'].should.equal('346158');

        //     var dl = yield remote.$download('/files/attachments/' + r.id + '/l');
        //     remote.shouldNoError(dl);
        //     dl.statusCode.should.equal(200);
        //     dl.headers['content-type'].should.equal('image/jpeg');
        //     parseInt(dl.headers['content-length'], 10).should.approximately(122826, 10000);

        //     var dm = yield remote.$download('/files/attachments/' + r.id + '/m');
        //     remote.shouldNoError(dm);
        //     dm.statusCode.should.equal(200);
        //     dm.headers['content-type'].should.equal('image/jpeg');
        //     parseInt(dm.headers['content-length'], 10).should.approximately(45043, 1000);

        //     var ds = yield remote.$download('/files/attachments/' + r.id + '/s');
        //     remote.shouldNoError(ds);
        //     ds.statusCode.should.equal(200);
        //     ds.headers['content-type'].should.equal('image/jpeg');
        //     parseInt(ds.headers['content-length'], 10).should.approximately(25269, 1000);
        // });

        // it('upload text as text/plain', async () => {
        //     // create attachment:
        //     var r = yield remote.$post(roles.CONTRIBUTOR, '/api/attachments', {
        //         name: ' Text   ',
        //         description: '   bla bla bla...  \n   ',
        //         mime: 'text/plain',
        //         data: remote.readFileSync('res-plain.txt').toString('base64')
        //     });
        //     remote.shouldNoError(r);
        //     r.name.should.equal('Text');
        //     r.description.should.equal('bla bla bla...');
        //     r.mime.should.equal('text/plain');
        // });

        // it('upload image but said text/plain', async () => {
        //     // create attachment:
        //     var r = yield remote.$post(roles.CONTRIBUTOR, '/api/attachments', {
        //         name: ' Fake Text   ',
        //         description: '   bla bla bla...  \n   ',
        //         mime: 'text/plain',
        //         data: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldNoError(r);
        //     r.name.should.equal('Fake Text');
        //     r.description.should.equal('bla bla bla...');
        //     r.mime.should.equal('image/jpeg');
        // });

        // it('upload text file by contributor then delete it', async () => {
        //     // create attachment:
        //     var r = yield remote.$post(roles.CONTRIBUTOR, '/api/attachments', {
        //         name: ' Text To Delete   ',
        //         description: '   bla bla bla...  \n   ',
        //         data: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldNoError(r);
        //     var r2 = yield remote.$post(roles.CONTRIBUTOR, '/api/attachments', {
        //         name: ' Text2 To Delete   ',
        //         description: '   bla bla bla...  \n   ',
        //         data: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldNoError(r2);
        //     // try delete by another users:
        //     var d1 = yield remote.$post(roles.SUBSCRIBER, '/api/attachments/' + r.id + '/delete');
        //     remote.shouldHasError(d1, 'permission:denied');
        //     // try delete by owner:
        //     var d2 = yield remote.$post(roles.CONTRIBUTOR, '/api/attachments/' + r.id + '/delete');
        //     remote.shouldNoError(d2);
        //     d2.id.should.equal(r.id);
        //     // try delete by admin:
        //     var d3 = yield remote.$post(roles.ADMIN, '/api/attachments/' + r2.id + '/delete');
        //     remote.shouldNoError(d3);
        //     d3.id.should.equal(r2.id);
        // });

    });
});
