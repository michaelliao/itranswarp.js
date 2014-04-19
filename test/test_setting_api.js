// test setting api:

var
    _ = require('lodash'),
    async=require('async'),
    should = require('should');

var remote = require('./_test');

var settingApi = require('../controllers/settingApi');

var log = console.log;

describe('#settings', function() {

    before(remote.setup);

    describe('#settingApi', function() {

        it('should get empty setting', function(done) {
            settingApi.getSetting('group:key', function(err, r) {
                should(err===null).be.ok;
                should(r===undefined).be.ok;
                done();
            });
        });

        it('should get default setting value', function(done) {
            settingApi.getSetting('group:key', 'the-DEFAULT', function(err, r) {
                should(err===null).be.ok;
                should(r==='the-DEFAULT').be.ok;
                done();
            });
        });

        it('set setting with invalid key', function(done) {
            settingApi.setSetting('g1---k1', 'VALUE-001', function(err) {
                should(err).be.ok;
                err.error.should.equal('parameter:invalid');
                err.data.should.equal('key');
                done();
            });
        });

        it('set and get setting', function(done) {
            settingApi.setSetting('g1:k1', 'VALUE-001', function(err) {
                should(err===null).be.ok;
                settingApi.getSetting('g1:k1', 'default', function(err, r) {
                    should(err===null).be.ok;
                    r.should.equal('VALUE-001');
                    done();
                });
            });
        });

        it('set and get settings', function(done) {
            var tasks = [];
            for (var i=0; i<9; i++) {
                (function(n) {
                    tasks.push(function(callback) {
                        settingApi.setSetting('web:key_' + n, 'VALUE--' + n, function(err) {
                            should(err===null).be.ok;
                            callback();
                        });
                    });
                })(i);
            }
            async.series(tasks, function(err, results) {
                settingApi.getSettings('web', function(err, r) {
                    should(err===null).be.ok;
                    r.key_0.should.equal('VALUE--0');
                    r.key_1.should.equal('VALUE--1');
                    r.key_2.should.equal('VALUE--2');
                    r.key_8.should.equal('VALUE--8');
                    should(r.key_9===undefined).be.ok;
                    done();
                });
            });
        });
    });
});
