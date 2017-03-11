'use strict';

/**
 * Test Attachment.
 */
const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    fs = require('fs'),
    request = require('supertest'),
    expect = require('chai').expect,
    db = require('../db'),
    Attachment = db.Attachment,
    logger = require('../logger'),
    helper = require('../helper'),
    attachmentApi = require('../controllers/attachmentApi');

describe('#attachment-api', () => {

    before(appsetup);

    after(appclose);

    describe('#attachment-apis', () => {

        before(async ()=> {
            logger.info('delete all attachments...');
            await Attachment.destroy($ALL);
        });

        it('no permission to get attachment(s)', async () => {
            var response;
            response = await request($SERVER)
                .get('/api/attachments')
                .set('Authorization', auth($SUBS))
                .expect('Content-Type', /application\/json/)
                .expect(400);
            expect(response.body.error).to.equal('permission:denied');
            response = await request($SERVER)
                .get('/api/attachments/' + db.nextId())
                .set('Authorization', auth($SUBS))
                .expect('Content-Type', /application\/json/)
                .expect(400);
            expect(response.body.error).to.equal('permission:denied');
        });

        it('should get empty attachments by contributor', async () => {
            var response;
            // subscriber:
            response = await request($SERVER)
                .get('/api/attachments')
                .set('Authorization', auth($CONTRIB))
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.page).to.a('object');
            expect(response.body.page.total).to.equal(0);
            expect(response.body.page.index).to.equal(1);
            expect(response.body.attachments).to.a('array').and.have.lengthOf(0);
        });

        it('create attachment failed by subscriber', async () => {
            // create attachment:
            var response;
            response = await request($SERVER)
                .post('/api/attachments')
                .set('Authorization', auth($SUBS))
                .send({
                    name: 'Test image',
                    description: 'test',
                    data: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
            expect(response.body.error).to.equal('permission:denied');
        });

        it('create image attachment ok by contributor and get/download', async () => {
            // create attachment:
            var response;
            response = await request($SERVER)
                .post('/api/attachments')
                .set('Authorization', auth($CONTRIB))
                .send({
                    name: 'Test image',
                    description: 'just test',
                    data: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.name).to.equal('Test image');
            expect(response.body.description).to.equal('just test');
            expect(response.body.mime).to.equal('image/jpeg');
            expect(response.body.width).to.equal(1280);
            expect(response.body.height).to.equal(720);
            expect(response.body.size).to.equal(346158);
            // get by subscriber:
            let id = response.body.id;
            response = await request($SERVER)
                .get('/api/attachments/' + id)
                .set('Authorization', auth($SUBS))
                .expect('Content-Type', /application\/json/)
                .expect(400);
            expect(response.body.error).to.equal('permission:denied');
            // get by contributor:
            response = await request($SERVER)
                .get('/api/attachments/' + id)
                .set('Authorization', auth($CONTRIB))
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.name).to.equal('Test image');
            expect(response.body.description).to.equal('just test');
            expect(response.body.mime).to.equal('image/jpeg');
            expect(response.body.width).to.equal(1280);
            expect(response.body.height).to.equal(720);
            expect(response.body.size).to.equal(346158);
            // download by anyone:
            response = await request($SERVER)
                .get('/files/attachments/' + id)
                .expect('Content-Type', /image\/jpeg/)
                .expect('Content-Length', '346158')
                .expect(200);
            // download size of 0, s, m, l:
            for (let size of ['0', 's', 'm', 'l']) {
                response = await request($SERVER)
                    .get(`/files/attachments/${id}/${size}`)
                    .expect('Content-Type', /image\/jpeg/)
                    .expect(200);
            }
        });

        it('create text attachment ok by contributor and download', async () => {
            // create attachment:
            var response;
            response = await request($SERVER)
                .post('/api/attachments')
                .set('Authorization', auth($CONTRIB))
                .send({
                    name: 'Text',
                    description: 'just text',
                    mime: 'text/plain',
                    data: fs.readFileSync(__dirname + '/res-plain.txt').toString('base64')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.name).to.equal('Text');
            expect(response.body.description).to.equal('just text');
            expect(response.body.mime).to.equal('text/plain');
            expect(response.body.width).to.equal(0);
            expect(response.body.height).to.equal(0);
            expect(response.body.size).to.equal(25197);
            // download by anyone:
            let id = response.body.id;
            response = await request($SERVER)
                .get('/files/attachments/' + id)
                .expect('Content-Type', /text\/plain/)
                .expect('Content-Length', '25197')
                .expect(200);
            // download size of s, m, l:
            for (let size of ['s', 'm', 'l']) {
                response = await request($SERVER)
                    .get(`/files/attachments/${id}/${size}`)
                    .expect(400);
            }
        });

        it('create attachment ok then delete it', async () => {
            // create attachment:
            var response;
            response = await request($SERVER)
                .post('/api/attachments')
                .set('Authorization', auth($CONTRIB))
                .send({
                    name: 'will be deleted',
                    description: 'just text',
                    mime: 'text/plain',
                    data: fs.readFileSync(__dirname + '/res-plain.txt').toString('base64')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.name).to.equal('will be deleted');
            let id = response.body.id;
            // delete by subscriber:
            response = await request($SERVER)
                .post(`/api/attachments/${id}/delete`)
                .set('Authorization', auth($SUBS))
                .send()
                .expect('Content-Type', /application\/json/)
                .expect(400);
            expect(response.body.error).to.equal('permission:denied');
            // delete by contributor:
            response = await request($SERVER)
                .post(`/api/attachments/${id}/delete`)
                .set('Authorization', auth($CONTRIB))
                .send()
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.id).to.equal(id);
            // query not found:
            response = await request($SERVER)
                .get(`/api/attachments/${id}`)
                .set('Authorization', auth($CONTRIB))
                .send()
                .expect('Content-Type', /application\/json/)
                .expect(400);
             expect(response.body.error).to.equal('entity:notfound');
        });

        it('get attachments by page', async () => {

        });
    });
});
