// test category api:

var api = require('./_test');

var assert = require('assert');
var log = console.log;

suite('test authentication', function() {
    setup(api.setup);

    suite('#/api/authenticate', function() {

        test('auth should ok', function(done) {
            api.post(api.guest, '/api/authenticate', {
                email: 'admin@itranswarp.com',
                passwd: 'e8f98b1676572cd24c753c331aa6b02e'
            }, function(r) {
                assert.equal(r.id, '001390000000000ffffffffff0ffffffffff0ffffffffff000', 'id is wrong.');
                assert.equal(r.email, 'admin@itranswarp.com', 'email is wrong.');
                assert.equal(r.passwd, '******', 'passwd not hidden.');
                done();
            });
        });

        test('auth should failed', function(done) {
            api.post(api.guest, '/api/authenticate', {
                email: 'admin@itranswarp.com',
                passwd: 'bad000000fffffffffffffffffffffff'
            }, function(r) {
                assert.equal(r.error, 'auth:failed', 'error code is wrong.');
                assert.ok(r.message, 'error message not found.');
                done();
            });
        });

        test('auth missing param', function(done) {
            api.post(api.guest, '/api/authenticate', {
                email: 'admin@itranswarp.com'
            }, function(r) {
                assert.equal(r.error, 'parameter:invalid', 'error code is wrong.');
                assert.equal(r.data, 'passwd', 'error data is wrong.');
                done();
            });
        });

        test('auth should forbidden because password is empty', function(done) {
            api.post(api.guest, '/api/authenticate', {
                email: 'nopass@itranswarp.com',
                passwd: '00000000000000000000000000000000'
            }, function(r) {
                assert.equal(r.error, 'auth:failed', 'error code is wrong.');
                assert.ok(r.message, 'error message not found.');
                done();
            });
        });

        test('auth should locked', function(done) {
            api.post(api.guest, '/api/authenticate', {
                email: 'lock@itranswarp.com',
                passwd: 'ff000111222333444555666777888999'
            }, function(r) {
                assert.equal(r.error, 'auth:locked', 'error code is wrong.');
                assert.ok(r.message, 'error message not found.');
                done();
            });
        });

    });
});
