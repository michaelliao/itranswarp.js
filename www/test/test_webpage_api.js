/**
 * Test Webpage.
 */
const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    _ = require('lodash'),
    request = require('supertest'),
    expect = require('chai').expect,
    db = require('../db'),
    logger = require('../logger'),
    Webpage = db.Webpage;

describe('#webpage apis', () => {

    before(appsetup);

    describe('#webpage api', () => {

        before(async ()=> {
            logger.info('delete all webpages...');
            await Webpage.destroy($ALL);
        });

        it('should get empty webpages', async () => {
            var response;
            // guest:
            response = await request($SERVER)
                    .get('/api/webpages')
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            expect(response.body.webpages).to.be.a('array').and.to.have.lengthOf(0);
            // subscriber:
            response = await request($SERVER)
                    .get('/api/webpages')
                    .set('Authorization', auth($SUBS))
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            expect(response.body.webpages).to.be.a('array').and.to.have.lengthOf(0);
        });

        it('create webpage failed by CONTRIB', async () => {
            let response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($CONTRIB))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'test',
                        name: 'Could not create webpage',
                        draft: false,
                        content: 'blablabla...'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(400);
            expect(response.body.error).to.equal('permission:denied');
        });

        it('create webpage failed by EDITOR for bad param', async () => {
            var response;

            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        // alias: 'MISSING',
                        name: 'ok',
                        draft: false,
                        content: 'blablabla...'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(400);
            expect(response.body.error).to.equal('parameter:invalid');
            expect(response.body.data).to.equal('alias');

            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'test',
                        // name: 'MISSING',
                        draft: false,
                        content: 'blablabla...'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(400);
            expect(response.body.error).to.equal('parameter:invalid');
            expect(response.body.data).to.equal('name');

            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'test',
                        name: 'ok',
                        draft: false,
                        // content: 'MISSING'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(400);
            expect(response.body.error).to.equal('parameter:invalid');
            expect(response.body.data).to.equal('content');
        });

        it('create webpage twice by EDITOR', async () => {
            var response;
            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'node',
                        name: 'Could create webpage',
                        tags: 'A, b & b ; ccc ',
                        draft: false,
                        content: 'blablabla...'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            expect(response.body.alias).to.equal('node');
            expect(response.body.tags).to.equal('A,b & b,ccc');
            // create with same alias:
            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'node',
                        name: 'Another webpage',
                        tags: 'A,B,C',
                        draft: false,
                        content: 'blablabla...'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(400);
            expect(response.body.error).to.equal('parameter:invalid');
            expect(response.body.data).to.equal('alias');
        });

        it('create and update by EDITOR', async () => {
            var response;
            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'js',
                        name: 'About javascript',
                        tags: 'js,node,v8',
                        draft: false,
                        content: 'blablabla...'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            expect(response.body.alias).to.equal('js');
            expect(response.body.name).to.equal('About javascript');
            expect(response.body.content).to.equal('blablabla...');
            expect(response.body.id).to.be.a('string').and.have.lengthOf(db.ID_LENGTH);
            let id = response.body.id;
            // query to verify:
            response = await request($SERVER)
                    .get('/api/webpages/' + id)
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            expect(response.body.alias).to.equal('js');
            expect(response.body.name).to.equal('About javascript');
            expect(response.body.content).to.equal('blablabla...');
            // update:
            response = await request($SERVER)
                    .post('/api/webpages/' + id)
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'nodejs',
                        name: 'About node.js',
                        tags: 'node.js',
                        draft: false,
                        content: 'changed.'
                    })
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            expect(response.body.alias).to.equal('nodejs');
            expect(response.body.name).to.equal('About node.js');
            expect(response.body.content).to.equal('changed.');
            // query to verify:
            response = await request($SERVER)
                    .get('/api/webpages/' + id)
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            expect(response.body.alias).to.equal('nodejs');
            expect(response.body.name).to.equal('About node.js');
            expect(response.body.content).to.equal('changed.');
        });

        it('create and update alias but duplicate by EDITOR', async () => {
            var response;
            // create webpage 'java':
            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'java',
                        name: 'About java',
                        content: 'blablabla...'
                    })
                    .expect(200);
            // create webpage 'lisp':
            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'lisp',
                        name: 'About lisp',
                        content: 'blablabla...'
                    })
                    .expect(200);
            // try update lisp to java:
            let id = response.body.id;
            response = await request($SERVER)
                    .post('/api/webpages/' + id)
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'java',
                        content: 'blablabla...'
                    })
                    .expect(400);
            expect(response.body.error).to.equal('parameter:invalid');
            expect(response.body.data).to.equal('alias');
        });

        it('get draft webpage by editor and non-editor', async () => {
            var response, id;
            // create draft webpages:
            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'jsjsjs',
                        name: 'About jsjsjs',
                        content: 'blablabla...',
                        draft: true
                    })
                    .expect(200);
            id = response.body.id;
            // get webpages by editor:
            response = await request($SERVER)
                    .get('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .expect(200);
            expect(response.body.webpages).to.be.a('array');
            expect(response.body.webpages.filter((wp) => {
                return wp.id === id;
            })).to.have.lengthOf(1);
            // get webpages by contributor:
            response = await request($SERVER)
                    .get('/api/webpages')
                    .set('Authorization', auth($CONTRIB))
                    .expect(200);
            expect(response.body.webpages).to.be.a('array');
            expect(response.body.webpages.filter((wp) => {
                return wp.id === id;
            })).to.have.lengthOf(0);
        });

        it('delete webpage by non-editor and editor', async () => {
            var response, i, id;
            // create:
            response = await request($SERVER)
                    .post('/api/webpages')
                    .set('Authorization', auth($EDITOR))
                    .set('Content-Type', 'application/json')
                    .send({
                        alias: 'del',
                        name: 'will be removed',
                        content: 'blablabla...'
                    })
                    .expect(200);
            id = response.body.id;
            // delete by non-editor:
            response = await request($SERVER)
                    .post('/api/webpages/' + id + '/delete')
                    .set('Authorization', auth($CONTRIB))
                    .expect(400);
            expect(response.body.error).to.equal('permission:denied');
            // delete by editor:
            response = await request($SERVER)
                    .post('/api/webpages/' + id + '/delete')
                    .set('Authorization', auth($EDITOR))
                    .expect(200);
            // query not found:
            response = await request($SERVER)
                    .get('/api/webpages/' + id)
                    .set('Authorization', auth($EDITOR))
                    .expect(400);
            expect(response.body.error).to.equal('entity:notfound');
            expect(response.body.data).to.equal('Webpage');
        });
    });
});
