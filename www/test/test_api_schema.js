/**
 * Test api_schema.js
 */
var
    _ = require('lodash'),
    api = require('../api'),
    schema = require('../api_schema'),
    expect = require('chai').expect;

describe('#schema', function () {

    it('no such schema name', function () {
        expect(() => {
            schema.validate('notExistName', {});
        }).to.throw(Error);
    });

    it('schema ok', function () {
        schema.validate('authenticate', {
            email: 'test@example.com',
            passwd: '0000000000111111111122222222223333333333'
        });
    });

    it('extra prop but schema is ok', function () {
        var data = {
            email: 'test@example.com',
            passwd: '0000000000111111111122222222223333333333',
            extra: true
        };
        schema.validate('authenticate', data);
        // extra property should be removed:
        expect(data).to.not.have.property('extra');
    });

    it('parameter missing', function () {
        expect(() => {
            schema.validate('authenticate', {
                passwd: '0000000000111111111122222222223333333333'
            });
        }).to.throw(api.APIError);
    });

    it('invalid pattern', function () {
        expect(() => {
            schema.validate('authenticate', {
                email: 'test@example.com',
                passwd: 'xxx'
            });
        }).to.throw(api.APIError);
    });

    it('invalid type', function () {
        expect(() => {
            schema.validate('authenticate', [1, 2, 3]);
        }).to.throw(api.APIError);
    });
});
