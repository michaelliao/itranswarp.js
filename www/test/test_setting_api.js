'use strict';

// test setting api:

var
    _ = require('lodash'),
    should = require('should'),
    remote = require('./_remote'),
    settingApi = require('../controllers/settingApi');

describe('#settings', () => {

    before(remote.setup);

    describe('#settingApi', () => {

        it('should get empty setting', async () => {
            var r = yield settingApi.$getSetting('group:key');
            should(r===null).be.ok;
        });

        it('should get default setting value', async () => {
            var r = yield settingApi.$getSetting('group:key', 'the-DEFAULT');
            should(r==='the-DEFAULT').be.ok;

            var r2 = yield settingApi.$getSetting('group:key', '');
            should(r2==='').be.ok;
        });

        it('set setting with invalid key', async () => {
            try {
                yield settingApi.$setSetting('g1---k1', 'VALUE-001');
                throw 'failed';
            }
            catch (e) {
                should(e.error).be.ok;
                e.error.should.equal('parameter:invalid');
                e.data.should.equal('key');
            }
        });

        it('set and get a setting', async () => {
            yield settingApi.$setSetting('g1:k1', 'VALUE-001');
            var r = yield settingApi.$getSetting('g1:k1', 'default');
            should(r).be.ok;
            r.should.equal('VALUE-001');
        });

        it('set and get settings', async () => {
            var i, r;
            for (i=0; i<9; i++) {
                yield settingApi.$setSetting('web:key_' + i, 'VALUE--' + i);
            }
            r = yield settingApi.$getSettings('web');
            should(r).be.ok;
            r.key_0.should.equal('VALUE--0');
            r.key_1.should.equal('VALUE--1');
            r.key_2.should.equal('VALUE--2');
            r.key_3.should.equal('VALUE--3');
            r.key_4.should.equal('VALUE--4');
            r.key_5.should.equal('VALUE--5');
            r.key_6.should.equal('VALUE--6');
            r.key_7.should.equal('VALUE--7');
            r.key_8.should.equal('VALUE--8');
            should(r.key_9===undefined).be.ok;
        });

        it('set settings', async () => {
            var s = {
                s1: '1+1',
                s2: '2+2',
                s3: '3+3'
            };
            yield settingApi.$setSettings('sss', s);
            // get settings:
            var r = yield settingApi.$getSettingsByDefaults('sss', {
                s1: 'x1',
                s2: 'x2',
                s3: 'x3',
                s4: 'x4'
            });
            r.s1.should.equal('1+1');
            r.s2.should.equal('2+2');
            r.s3.should.equal('3+3');
            r.s4.should.equal('x4');
        });
    });
});
