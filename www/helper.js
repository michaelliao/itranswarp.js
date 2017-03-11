'use strict';

// helper:

var
    _ = require('lodash'),
    api = require('./api'),
    Page = require('./page');

var re_int = /^[0-9]+$/;

function _str2int(s, defValue) {
    if (re_int.test(s)) {
        return parseInt(s, 10);
    }
    return defValue;
}

// ' A, B ; Ccc, ccc ' -> 'A,B,Ccc'
function _formatTags(tags) {
    if (! tags) {
        return '';
    }
    let arr = tags.split(/[\,\;\uff0c\uff1b]/).map((value) => {
        return value.trim();
    }).filter((value) => {
        return value !== '';
    });
    // remove duplicate ignore case:
    let lowerArr = arr.map((value) => {
        return value.toLowerCase();
    });
    return arr.filter((value, index) => {
        return lowerArr.indexOf(value.toLowerCase()) === index;
    }).join(',');
}

module.exports = {

    formatTags: _formatTags,

    // $sort: function* (ids, entities) {
    //     var i, pos, entity;
    //     if (entities.length !== ids.length) {
    //         throw api.invalidParam('ids', 'Invalid id list: expected ' + entities.length + ' ids.');
    //     }
    //     for (i=0; i<entities.length; i++) {
    //         entity = entities[i];
    //         pos = ids.indexOf(entity.id);
    //         if (pos === (-1)) {
    //             throw api.invalidParam('ids', 'Invalid id list: id \"' + entity.id + '\" not found.');
    //         }
    //         entity.display_order = pos;
    //     }
    //     // update:
    //     for (i=0; i<entities.length; i++) {
    //         entity = entities[i];
    //         yield entity.$update(['display_order', 'updated_at', 'version']);
    //     }
    //     return _.sortBy(entities, function (entity) {
    //         return entity.display_order;
    //     });
    // },

    getPageIndex: function (request) {
        var index = _str2int(request.query.page, 1);
        if (index < 1) {
            index = 1;
        }
        return index;
    },

    getPage: function (request, pageSize=10) {
        var
            index = _str2int(request.query.page, 1),
            size = _str2int(request.query.size, pageSize);
        if (index < 1) {
            index = 1;
        }
        if (size < 10 || size > 100) {
            size = 10;
        }
        return new Page(index, size);
    }

    // isString: function (val) {
    //     return typeof(val) === 'string';
    // },

    // isInteger: function (val) {
    //     return (typeof(val) === 'number') && (val === Math.floor(val));
    // },

    // string2Integer: string2Integer
};
