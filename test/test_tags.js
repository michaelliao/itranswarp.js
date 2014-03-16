// test tags:

var should = require('should');

var utils = require('../controllers/_utils');

var format_tags = utils.format_tags;

describe('#utils', function() {

    it('#format_tags', function() {
        var tags = {
            '   '             : '',
            '   ,  '          : '',
            ' A,B  ,C  , '    : 'A,B,C',
            ',,A;B;C ,  '     : 'A,B,C',
            ' Abc, abc, A B'  : 'Abc,A B',
            '  R&D, R & D  '  : 'R&D,R & D',
            'a-b-c d-e-f,'    : 'a-b-c d-e-f'
        }
        format_tags('  ABC, def, ha ha ').should.equal('ABC,def,ha ha');
    });
});
