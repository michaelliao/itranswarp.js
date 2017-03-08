'use strict';

// helper:

var
    _ = require('lodash'),
    marked = require('marked'),
    htmlparser = require('htmlparser2'),
    api = require('./api'),
    Page = require('./page');

var re_int = /^[0-9]+$/;

function string2Integer(s) {
    if (re_int.test(s)) {
        return parseInt(s, 10);
    }
    return null;
}

var safeRenderer = new marked.Renderer();

safeRenderer.link = function (href, title, text) {
    if (href.indexOf('http://') !== 0 && href.indexOf('https://') !== 0) {
        href = 'http://' + href;
    }
    return '<a target="_blank" rel="nofollow" href="' + href + '">' + text + '</a>';
};

async function md2html(md, cacheKey, isSafeInput) {
    if (cacheKey) {
        //
    }
    var html = isSafeInput ? marked(md) : marked(md, {
        sanitize: true,
        renderer: safeRenderer
    });
    return html;
}

function md2html(md, isSafeInput) {
    var html = isSafeInput ? marked(md) : marked(md, {
        sanitize: true,
        renderer: safeRenderer
    });
    return html;
}

// ' A, B ; Ccc, ccc ' -> 'A,B,Ccc'
function formatTags(tags) {
    if (!tags) {
        return '';
    }
    var
        lv,
        dict = {},
        arr = _.map(tags.split(/[\,\;\，\；]/), function (value) {
            return value.trim();
        });
    return _.filter(arr, function (value) {
        if (value) {
            lv = value.toLowerCase();
            if (dict.hasOwnProperty(lv)) {
                return false;
            }
            dict[lv] = true;
            return true;
        }
        return false;
    }).join(',');
}

module.exports = {

    formatTags: formatTags,

    md2html: md2html,

    $md2html: $md2html,

    $sort: function* (ids, entities) {
        var i, pos, entity;
        if (entities.length !== ids.length) {
            throw api.invalidParam('ids', 'Invalid id list: expected ' + entities.length + ' ids.');
        }
        for (i=0; i<entities.length; i++) {
            entity = entities[i];
            pos = ids.indexOf(entity.id);
            if (pos === (-1)) {
                throw api.invalidParam('ids', 'Invalid id list: id \"' + entity.id + '\" not found.');
            }
            entity.display_order = pos;
        }
        // update:
        for (i=0; i<entities.length; i++) {
            entity = entities[i];
            yield entity.$update(['display_order', 'updated_at', 'version']);
        }
        return _.sortBy(entities, function (entity) {
            return entity.display_order;
        });
    },

    getPageNumber: function (request) {
        var index = string2Integer(request.query.page || '1');
        if (index === null || index < 1) {
            index = 1;
        }
        return index;
    },

    getPage: function (request, pageSize) {
        var
            index = string2Integer(request.query.page || '1'),
            size = pageSize || string2Integer(request.query.size || '10');
        if (index === null || index < 1) {
            index = 1;
        }
        if (size === null || size < 10 || size > 100) {
            size = 10;
        }
        return new Page(index, size);
    },

    isString: function (val) {
        return typeof(val) === 'string';
    },

    isInteger: function (val) {
        return (typeof(val) === 'number') && (val === Math.floor(val));
    },

    string2Integer: string2Integer
};
