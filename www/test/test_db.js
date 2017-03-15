'use strict';

/**
 * Test db.js
 */
const
    dbsetup = require('./_dbsetup'), // <-- MUST be first import
    _ = require('lodash'),
    db = require('../db'),
    sleep = require('sleep-promise'),
    expect = require('chai').expect,
    Category = db.Category,
    Setting = db.Setting,
    Article = db.Article;

describe('#db-test', () => {

    describe('#settingApi', () => {

        before(dbsetup);

        it('#query db', async () => {
            let articles = await Article.findAll();
            expect(articles).to.have.lengthOf(0);
            let article = await Article.findById(db.nextId());
            expect(article).to.be.null;
        });

        it('#curd test', async () => {
            let
                cat = await Category.create({
                    name: 'Sample',
                    tag: 'cat,dog',
                    display_order: 1,
                    description: 'sample category'
                });
            expect(cat.name).to.equal('Sample');
            expect(cat.tag).to.equal('cat,dog');
            expect(cat.display_order).to.equal(1);
            expect(cat.description).to.equal('sample category');
            // check created_at, updated_at, version:
            expect(cat.created_at).to.within(Date.now() - 3000, Date.now() + 1000);
            expect(cat.created_at).to.equal(cat.updated_at);
            expect(cat.version).to.equal(0);
            await sleep(500);
            // update:
            cat.name = 'Changed';
            await cat.save();
            expect(cat.name).to.equal('Changed');
            expect(cat.updated_at).to.greaterThan(cat.created_at);
            expect(cat.version).to.equal(1);
            // test version if update name only:
            await cat.update({
                name: 'Partial Update'
            });
            expect(cat.name).to.equal('Partial Update');
            expect(cat.version).to.equal(2);
            // query to check again:
            let copy = await Category.findById(cat.id);
            expect(copy.name).to.equal('Partial Update');
            expect(copy.version).to.equal(2);
            // serialize test:
            copy.extra = 1234;
            let s = JSON.stringify(copy);
            expect(s).to.contain('"name":"Partial Update"');
            expect(s).to.contain('"version":2');
            // destroy test:
            await copy.destroy();
            let q = await Category.findById(cat.id);
            expect(q).to.be.null;
        });

        it('#batch delete test', async () => {
            for (let i=0; i<10; i++) {
                await Setting.create({
                    group: 'g',
                    key: 'g:key' + i,
                    value: 'value-' + i
                });
            }
            // update:
            await Setting.update({
                value: 'special'
            }, {
                where: {
                    key: 'g:key9'
                }
            });
            // check:
            let
                s9 = await Setting.findOne({
                    where: {
                        key: 'g:key9'
                    }
                });
            expect(s9.value).to.equal('special');
            // delete:
            await Setting.destroy({
                where: {
                    key: {
                        $gt: 'g:key5'
                    }
                }
            });
            let count = await Setting.count();
            expect(count).to.equal(6);
        });
    });
});
