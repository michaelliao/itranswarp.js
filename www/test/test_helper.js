'use strict';

/**
 * Test helper.js
 */
const
    fs = require('fs'),
    querystring = require('querystring'),
    expect = require('chai').expect,
    helper = require('../helper'),
    Page = require('../page');

function createMockRequest(query='') {
    var
        qs = querystring.parse(query),
        k, v,
        req = {
            query: {
            }
        };
    for (k in qs) {
        req.query[k] = qs[k];
    }
    return req;
}

describe('#helper', () => {

    it('#formatTags', () => {
        var params, tags = [
            // input             , output
            [null                , ''],
            [undefined           , ''],
            [''                  , ''],
            ['   '               , ''],
            ['   ,  '            , ''],
            [' A,B  ,C  , '      , 'A,B,C'],
            [',,A;B;C ,  '       , 'A,B,C'],
            [' Abc, abc, A B'    , 'Abc,A B'],
            ['  R&D, R & D  '    , 'R&D,R & D'],
            ['  ABC, def, ha ha ', 'ABC,def,ha ha'],
            ['a-b-c d-e-f,'      , 'a-b-c d-e-f']
        ];
        for (params of tags) {
            expect(helper.formatTags(params[0])).to.equal(params[1]);
        }
    });

    it('#page', () => {
        var pages = [
            // index, per, total, pages, offset:
            [  1,     20,  81,    5,     0],
            [  2,     20,  99,    5,     20],
            [  3,     20,  100,   5,     40],
            [  1,     20,  101,   6,     0],
            [  1,     20,  101,   6,     0],
            [  1,     5,   5,     1,     0],
            [  10,    10,  99,    10,    90]
        ];
        for (var i=0; i<pages.length; i++) {
            var data = pages[i];
            var
                pageIndex = data[0],
                itemsPerPage = data[1],
                totalItems = data[2],
                totalPages = data[3],
                offset = data[4];
            var page = new Page(pageIndex, itemsPerPage);
            page.total = totalItems;
            expect(page.pages).to.equal(totalPages);
            expect(page.offset).to.equal(offset);
        }
    });

    it('#getPageIndex', () => {
        expect(helper.getPageIndex(createMockRequest(''))).to.equal(1);
        expect(helper.getPageIndex(createMockRequest('page=1'))).to.equal(1);
        expect(helper.getPageIndex(createMockRequest('page=2'))).to.equal(2);
        expect(helper.getPageIndex(createMockRequest('page=9'))).to.equal(9);
        expect(helper.getPageIndex(createMockRequest('page=100'))).to.equal(100);
        // invalid format:
        expect(helper.getPageIndex(createMockRequest('page=-1'))).to.equal(1);
        expect(helper.getPageIndex(createMockRequest('page=-2'))).to.equal(1);
        expect(helper.getPageIndex(createMockRequest('page=123s'))).to.equal(1);
        expect(helper.getPageIndex(createMockRequest('page='))).to.equal(1);
    });

    it('#getPage', () => {
        var page;
        page = helper.getPage(createMockRequest(''));
        expect(page.index).to.equal(1);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=2'));
        expect(page.index).to.equal(2);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=2&size='));
        expect(page.index).to.equal(2);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=2&size=20'));
        expect(page.index).to.equal(2);
        expect(page.size).to.equal(20);
        // out of range:
        page = helper.getPage(createMockRequest('page=2&size=200'));
        expect(page.index).to.equal(2);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=2&size=9'));
        expect(page.index).to.equal(2);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=2&size=x'));
        expect(page.index).to.equal(2);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=2&size=20x'));
        expect(page.index).to.equal(2);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=2x&size=10'));
        expect(page.index).to.equal(1);
        expect(page.size).to.equal(10);
        page = helper.getPage(createMockRequest('page=&size=10'));
        expect(page.index).to.equal(1);
        expect(page.size).to.equal(10);
    });
});
