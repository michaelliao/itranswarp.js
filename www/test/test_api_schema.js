'use strict';

/**
 * Test api_schema.js
 */
var
    _ = require('lodash'),
    api = require('../api'),
    schema = require('../api_schema'),
    expect = require('chai').expect;

describe('#schema', () => {

    it('no such schema name', () => {
        expect(() => {
            schema.validate('notExistName', {});
        }).to.throw(Error);
    });

    it('schema ok', () => {
        schema.validate('authenticate', {
            email: 'test@example.com',
            passwd: '0000000000111111111122222222223333333333'
        });
    });

    it('extra prop but schema is ok', () => {
        var data = {
            email: 'test@example.com',
            passwd: '0000000000111111111122222222223333333333',
            extra: true
        };
        schema.validate('authenticate', data);
        // extra property should be removed:
        expect(data).to.not.have.property('extra');
    });

    it('data is undefined', () => {
        expect(() => {
            schema.validate('authenticate', undefined);
        }).to.throw(api.APIError);
    });

    it('data is null', () => {
        expect(() => {
            schema.validate('authenticate', null);
        }).to.throw(api.APIError);
    });

    it('data is function', () => {
        expect(() => {
            schema.validate('authenticate', () => {});
        }).to.throw(api.APIError);
    });

    it('data is str', () => {
        expect(() => {
            schema.validate('authenticate', '');
        }).to.throw(api.APIError);
    });

    it('parameter missing', () => {
        expect(() => {
            schema.validate('authenticate', {
                passwd: '0000000000111111111122222222223333333333'
            });
        }).to.throw(api.APIError);
    });

    it('invalid pattern', () => {
        expect(() => {
            schema.validate('authenticate', {
                email: 'test@example.com',
                passwd: 'xxx'
            });
        }).to.throw(api.APIError);
    });

    it('invalid type', () => {
        expect(() => {
            schema.validate('authenticate', [1, 2, 3]);
        }).to.throw(api.APIError);
    });
});
