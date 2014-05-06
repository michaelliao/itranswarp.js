// test utils:

var should = require('should');

var utils = require('../controllers/_utils');

var formatTags = utils.formatTags;

describe('#utils', function () {

    it('#formatTags', function () {
        var tags = {
            '   '             : '',
            '   ,  '          : '',
            ' A,B  ,C  , '    : 'A,B,C',
            ',,A;B;C ,  '     : 'A,B,C',
            ' Abc, abc, A B'  : 'Abc,A B',
            '  R&D, R & D  '  : 'R&D,R & D',
            'a-b-c d-e-f,'    : 'a-b-c d-e-f'
        }
        formatTags('  ABC, def, ha ha ').should.equal('ABC,def,ha ha');
    });

    it('#page', function () {
        var pages = [
            // index, perPage, total, pages, offset:
            [ 1,  undefined, 81,   5,  0],
            [ 2,  undefined, 99,   5,  20],
            [ 3,  undefined, 100,  5,  40],
            [ 1,  undefined, 101,  6,  0],
            [ 1,  undefined, 101,  6,  0],
            [ 1,  10,        5,    1,  0],
            [ 10, 10,        99,   10, 90]
        ];
        for (var i=0; i<pages.length; i++) {
            var data = pages[i];
            var
                pageIndex = data[0],
                itemsPerPage = data[1],
                totalItems = data[2],
                totalPages = data[3],
                offset = data[4];
            var page = utils.page(pageIndex, itemsPerPage);
            page.totalItems = totalItems;
            page.totalPages.should.equal(totalPages);
            page.offset.should.equal(offset);
        }
    });
});
