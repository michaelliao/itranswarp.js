'use strict';

// test user api:

var
    _ = require('lodash'),
    should = require('should'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#user', function () {

    before(remote.setup);

    describe('#api', function () {

        it('get users by editor and contributor', function* () {
            var i;
            // get users by contributor:
            var r1 = yield remote.$get(roles.CONTRIBUTOR, '/api/users');
            remote.shouldHasError(r1, 'permission:denied');
            // get users by editor:
            var r2 = yield remote.$get(roles.EDITOR, '/api/users');
            remote.shouldNoError(r2);
            r2.page.total.should.equal(4);
            r2.users.should.be.an.Array.and.have.length(4);
            for (i=0; i<r2.users.length; i++) {
                r2.users[i].passwd.should.equal('******');
            }
            var uid = r2.users[0].id;
            // get user by contributor:
            var r3 = yield remote.$get(roles.CONTRIBUTOR, '/api/users/' + uid);
            remote.shouldHasError(r3, 'permission:denied');
            // get user by editor:
            var r4 = yield remote.$get(roles.EDITOR, '/api/users/' + uid);
            remote.shouldNoError(r4);
            r4.passwd.should.equal('******');
        });

        it('auth should ok', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@itranswarp.com',
                passwd: remote.generatePassword('admin@itranswarp.com')
            });
            remote.shouldNoError(r);
            r.email.should.equal('admin@itranswarp.com');
            r.passwd.should.equal('******');
        });

        it('auth should failed for bad password', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@itranswarp.com',
                passwd: 'bad000000fffffffffffffffffffffffffffffff'
            });
            remote.shouldHasError(r, 'auth:failed');
        });

        it('auth should failed for invalid password', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@itranswarp.com',
                passwd: 'bad000000fffffffffffffffffffffff' // 32-char
            });
            remote.shouldHasError(r, 'parameter:invalid', 'passwd');
        });

        it('auth should failed for invalid email', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'notexist@itranswarp.com',
                passwd: 'bad000000fffffffffffffffffffffffffffffff' // 32-char
            });
            remote.shouldHasError(r, 'auth:failed', 'email');
        });

        it('auth missing param', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@itranswarp.com'
            });
            remote.shouldHasError(r, 'parameter:invalid', 'passwd');
        });

        it('auth should forbidden because password is empty', function* () {
            yield remote.warp.$update('update users set passwd=? where email=?', ['', 'contributor@itranswarp.com']);
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'contributor@itranswarp.com',
                passwd: remote.generatePassword('contributor@itranswarp.com')
            });
            remote.shouldHasError(r, 'auth:failed', 'passwd');
        });

        it('auth should locked', function* () {
            yield remote.warp.$update('update users set locked_until=? where email=?', [Date.now() + 3600000, 'editor@itranswarp.com']);
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'editor@itranswarp.com',
                passwd: remote.generatePassword('editor@itranswarp.com')
            });
            remote.shouldHasError(r, 'auth:failed', 'locked');
        });
    });
});
