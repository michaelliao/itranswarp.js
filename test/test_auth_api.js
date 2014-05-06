// test category api:

var remote = require('./_test');

var should = require('should');

describe('#authentication', function () {

    before(remote.setup);

    describe('#api', function () {

        it('auth should ok', function (done) {
            remote.post(remote.guest, '/api/authenticate', {
                email: 'admin@itranswarp.com',
                passwd: 'e8f98b1676572cd24c753c331aa6b02e'
            }, function (r) {
                r.id.should.equal('001390000000000ffffffffff0ffffffffff0ffffffffff000');
                r.email.should.equal('admin@itranswarp.com');
                r.passwd.should.equal('******');
                done();
            });
        });

        it('auth should failed', function (done) {
            remote.post(remote.guest, '/api/authenticate', {
                email: 'admin@itranswarp.com',
                passwd: 'bad000000fffffffffffffffffffffff'
            }, function (r) {
                r.error.should.equal('auth:failed');
                r.message.should.be.ok;
                done();
            });
        });

        it('auth missing param', function (done) {
            remote.post(remote.guest, '/api/authenticate', {
                email: 'admin@itranswarp.com'
            }, function (r) {
                r.error.should.equal('parameter:invalid');
                r.data.should.equal('passwd');
                done();
            });
        });

        it('auth should forbidden because password is empty', function (done) {
            remote.post(remote.guest, '/api/authenticate', {
                email: 'nopass@itranswarp.com',
                passwd: '00000000000000000000000000000000'
            }, function (r) {
                r.error.should.equal('auth:failed');
                r.message.should.ok;
                done();
            });
        });

        it('auth should locked', function (done) {
            remote.post(remote.guest, '/api/authenticate', {
                email: 'lock@itranswarp.com',
                passwd: 'ff000111222333444555666777888999'
            }, function (r) {
                r.error.should.equal('auth:locked');
                r.message.should.ok;
                done();
            });
        });
    });
});
