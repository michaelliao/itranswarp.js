'use strict';

// test user api

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    config = require('../config');

// set https mode:
config.session_https = 'true';

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
        expect(response.body.page.total).to.equal(7);
        expect(response.body.users).to.a('array').and.to.have.lengthOf(7);
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
        let userId = response.body.id;
        // check cookie:
        let cookies = response.get('Set-Cookie');
        expect(cookies).to.a('array').and.to.have.lengthOf(1);
        let cookie = cookies[0];
        expect(cookie).to.a('string').and.to.contains('httponly');
        logger.info('get cookie: ' + cookie);
        let pos = cookie.indexOf('isession=');
        expect(pos).to.gte(0);
        let cookieStr = cookie.substring(pos, cookie.indexOf(';', pos));
        logger.info('cookie string: ' + cookieStr);
        // login using cookie:
        response = await request($SERVER)
                .get('/api/users/me')
                .set('Cookie', cookieStr)
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.id).to.equal(userId);
        expect(response.body.name).to.equal('subs');
        expect(response.body.email).to.equal('subs@itranswarp.com');
    });

    it('auth should failed for bad password', async () => {
        let
            email = $ADMIN.email,
            badHashedPasswd = crypto.createHash('sha1').update($ADMIN.email + ':badpassword').digest('hex');
        let response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: email,
                    passwd: badHashedPasswd
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('auth:failed');
    });

    it('auth should failed for invalid password', async () => {
        let response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: $ADMIN.email,
                    passwd: 'xxxxxxxxxx0000000000xxxxxxxxxx0000000000' // not a valid sha-1
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('passwd');
    });

    it('auth should failed for invalid email', async () => {
        let
            email = $ADMIN.email,
            hashedPasswd = crypto.createHash('sha1').update($ADMIN.email + ':password').digest('hex');
        let response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: 'admin#itranswarp.com',
                    passwd: hashedPasswd
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('email');
    });

    it('auth should failed for email not exist', async () => {
        let
            email = $ADMIN.email,
            hashedPasswd = crypto.createHash('sha1').update($ADMIN.email + ':password').digest('hex');
        let response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: 'notexist@itranswarp.com',
                    passwd: hashedPasswd
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('auth:failed');
        expect(response.body.data).to.equal('email');
    });

    it('sign in failed for user is locked', async () => {
        let response = await request($SERVER)
                .get('/api/users/me')
                .set('Authorization', auth($LOCKED))
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        let
            email = $LOCKED.email,
            hashedPasswd = crypto.createHash('sha1').update($LOCKED.email + ':password').digest('hex');
        response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: email,
                    passwd: hashedPasswd
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('auth:failed');
        expect(response.body.data).to.equal('locked');
    });

    it('set user role by editor failed', async () => {
        // set by editor:
        let response = await request($SERVER)
                .post(`/api/users/${$CONTRIB.id}/role`)
                .set('Authorization', auth($EDITOR))
                .send({
                    role: 10 // editor
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('change admin role by admin failed', async () => {
        // set by admin:
        let response = await request($SERVER)
                .post(`/api/users/${$ADMIN.id}/role`)
                .set('Authorization', auth($ADMIN))
                .send({
                    role: 10 // editor
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('change user role by admin ok', async () => {
        let response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: 'subs@itranswarp.com',
                    passwd: crypto.createHash('sha1').update('subs@itranswarp.com:password').digest('hex')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.name).to.equal('subs');
        expect(response.body.role).to.equal(constants.role.SUBSCRIBER);
        // set role to editor by admin:
        response = await request($SERVER)
                .post(`/api/users/${$SUBS.id}/role`)
                .set('Authorization', auth($ADMIN))
                .send({
                    role: 10 // editor
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        // login again as editor:
        response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: 'subs@itranswarp.com',
                    passwd: crypto.createHash('sha1').update('subs@itranswarp.com:password').digest('hex')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.name).to.equal('subs');
        expect(response.body.role).to.equal(constants.role.EDITOR);
    });

    it('lock user and its cookie should be invalid', async () => {
        // authenticate ok:
        let response = await request($SERVER)
                .post('/api/authenticate')
                .send({
                    email: 'subs@itranswarp.com',
                    passwd: crypto.createHash('sha1').update('subs@itranswarp.com:password').digest('hex')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.email).to.equal('subs@itranswarp.com');
        let userId = response.body.id;
        // get cookie:
        let cookies = response.get('Set-Cookie');
        expect(cookies).to.a('array').and.to.have.lengthOf(1);
        let cookie = cookies[0];
        let pos = cookie.indexOf('isession=');
        let cookieStr = cookie.substring(pos, cookie.indexOf(';', pos));
        logger.info('cookie string: ' + cookieStr);
        // login using cookie ok:
        response = await request($SERVER)
                .get('/api/users/me')
                .set('Cookie', cookieStr)
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.email).to.equal('subs@itranswarp.com');

        let LOCKTIME = Date.now() + 3600000;
        // lock this user failed by editor:
        response = await request($SERVER)
                .post(`/api/users/${userId}/lock`)
                .set('Authorization', auth($EDITOR))
                .send({
                    locked_until: LOCKTIME
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
        // lock this user ok by admin:
        response = await request($SERVER)
                .post(`/api/users/${userId}/lock`)
                .set('Authorization', auth($ADMIN))
                .send({
                    locked_until: LOCKTIME
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.email).to.equal('subs@itranswarp.com');
        expect(response.body.locked_until).to.equal(LOCKTIME);
        // login using cookie failed for user is already locked:
        response = await request($SERVER)
                .get('/api/users/me')
                .set('Cookie', cookieStr)
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
        cookies = response.get('Set-Cookie');
        expect(cookies).to.a('array').and.to.have.lengthOf(1);
        cookie = cookies[0];
        expect(cookie).to.a('string').and.to.contains('isession=deleted');

        // lock admin user failed:
        response = await request($SERVER)
                .post(`/api/users/${$ADMIN.id}/lock`)
                .set('Authorization', auth($ADMIN))
                .send({
                    locked_until: LOCKTIME
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
    })
});
