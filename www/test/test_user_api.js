'use strict';

// test user api

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    config = require('../config');

// set https mode:
config.session.https = true;

const
    crypto = require('crypto'),
    request = require('supertest'),
    expect = require('chai').expect,
    db = require('../db'),
    logger = require('../logger'),
    constants = require('../constants'),
    User = db.User,
    userApi = require('../controllers/userApi');

describe('#user', () => {

    before(appsetup);

    after(appclose);

    it('get users by editor and contributor', async () => {
        // get users by contributor:
        let response = await request($SERVER)
                .get('/api/users')
                .set('Authorization', auth($CONTRIB))
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // get users by editor:
        response = await request($SERVER)
                .get('/api/users')
                .set('Authorization', auth($EDITOR))
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.page).to.a('object');
        expect(response.body.page.total).to.equal(5);
        expect(response.body.users).to.a('array').and.to.have.lengthOf(5);
        // get user by contributor:
        response = await request($SERVER)
                .get(`/api/users/${$CONTRIB.id}`)
                .set('Authorization', auth($CONTRIB))
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // get user by editor:
        response = await request($SERVER)
                .get(`/api/users/${$CONTRIB.id}`)
                .set('Authorization', auth($EDITOR))
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.name).to.equal('contrib');
    });

    it('auth should ok', async () => {
        let response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: 'subs@itranswarp.com',
                    passwd: crypto.createHash('sha1').update('subs@itranswarp.com:password').digest('hex')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.name).to.equal('subs');
        expect(response.body.email).to.equal('subs@itranswarp.com');
        expect(response.body.role).to.equal(constants.role.SUBSCRIBER);
        // check cookie:
        let cookies = response.get('Set-Cookie');
        expect(cookies).to.a('array').and.to.have.lengthOf(1);
        let cookie = cookies[0];
        expect(cookie).to.a('string').and.to.contains('httponly').and.to.contains('secure');
        logger.info('get cookie: ' + cookie);
        let pos = cookie.indexOf('isession=');
        expect(pos).to.gte(0);
        let s = cookie.substring(pos + 9, cookie.indexOf(';', pos));
        logger.info('session: ' + s);
    });

    // it('auth should failed for bad password', async () => {
    //     var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
    //         email: 'admin@itranswarp.com',
    //         passwd: 'bad0000000ffffffffffffffffffffffffffffff' // 40-char
    //     });
    //     remote.shouldHasError(r, 'auth:failed');
    // });

    // it('auth should failed for invalid password', async () => {
    //     var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
    //         email: 'admin@itranswarp.com',
    //         passwd: 'bad0000000ffffffffffffffffffffffffffffff' // 40-char
    //     });
    //     remote.shouldHasError(r, 'parameter:invalid', 'passwd');
    // });

    // it('auth should failed for invalid email', async () => {
    //     var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
    //         email: 'notexist@itranswarp.com',
    //         passwd: 'bad0000000ffffffffffffffffffffffffffffff' // 40-char
    //     });
    //     remote.shouldHasError(r, 'auth:failed', 'email');
    // });

    // it('auth missing param', async () => {
    //     var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
    //         email: 'admin@itranswarp.com'
    //     });
    //     remote.shouldHasError(r, 'parameter:invalid', 'passwd');
    // });

    // it('auth should forbidden because password is not set', async () => {
    //     yield remote.warp.$update('delete from localusers where user_id in (select id from users where email=?)', ['contributor@itranswarp.com']);
    //     var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
    //         email: 'contributor@itranswarp.com',
    //         passwd: remote.generatePassword('contributor@itranswarp.com')
    //     });
    //     remote.shouldHasError(r, 'auth:failed', 'passwd');
    // });

    // it('auth should locked', async () => {
    //     yield remote.warp.$update('update users set locked_until=? where email=?', [Date.now() + 3600000, 'editor@itranswarp.com']);
    //     var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
    //         email: 'editor@itranswarp.com',
    //         passwd: remote.generatePassword('editor@itranswarp.com')
    //     });
    //     remote.shouldHasError(r, 'auth:failed', 'locked');
    // });
});
