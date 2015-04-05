'use strict';

// helper:

var
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

var HTML2TEXT_TAGS = {
    'applet': ' ',
    'area': ' ',
    'audio': '\n',
    'base': ' ',
    'basefont': '',
    'br': '\n',
    'button': ' ',
    'canvas': ' ',
    'cite': ' ',
    'col': ' ',
    'colgroup': ' ',
    'datalist': ' ',
    'dialog': ' ',
    'embed': ' ',
    'frame': '',
    'frameset': '',
    'head': '',
    'hr': '\n',
    'iframe': '',
    'img': ' ',
    'input': ' ',
    'kbd': ' ',
    'keygen': ' ',
    'link': ' ',
    'map': ' ',
    'meta': ' ',
    'meter': ' ',
    'noframes': ' ',
    'noscript': ' ',
    'object': ' ',
    'optgroup': ' ',
    'option': ' ',
    'output': ' ',
    'param': ' ',
    'progress': ' ',
    'script': '\n',
    'select': ' ',
    'source': ' ',
    'style': ' ',
    'textarea': ' ',
    'track': ' ',
    'var': ' ',
    'video': '\n',
    'wbr': '\n'
};

function html2text(html) {
    var
        buffer = [],
        saveTexts = [true],
        saveCurrent = true,
        parser = new htmlparser.Parser({
            onopentag: function (tagname, attribs) {
                if (saveCurrent) {
                    saveCurrent = !HTML2TEXT_TAGS[tagname];
                }
                saveTexts.push(saveCurrent);
            },
            ontext: function (text) {
                if (saveCurrent) {
                    buffer.push(text);
                }
            },
            onclosetag: function (tagname) {
                saveTexts.pop();
                saveCurrent = saveTexts[saveTexts.length - 1];
            }
        }, {
            decodeEntities: true
        });
    parser.write(html);
    parser.end();
    return buffer.join('').replace(/\n/ig, ' ');
}

function* $md2html(md, cacheKey, isSafeInput) {
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

    html2text: html2text,

    md2html: md2html,

    $md2html: $md2html,

    $sort: function* (ids, entities) {
        var i, pos, entity;
        if (entities.length !== ids.length) {
            throw api.invalidParam('ids', 'Invalid id list.');
        }
        for (i=0; i<entities.length; i++) {
            entity = entities[i];
            pos = ids.indexOf(entities.id);
            if (pos === (-1)) {
                throw api.invalidParam('ids', 'Invalid id list.');
            }
            entity.display_order = i;
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

    checkPermission: function (request, expectedRole) {
        if (!request.user || (request.user.role > expectedRole)) {
            console.log('check permission failed: expected = ' + expectedRole + ', actual = ' + (request.user ? request.user.role : 'null'));
            throw api.notAllowed();
        }
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
