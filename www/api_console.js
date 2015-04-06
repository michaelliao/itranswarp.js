'use strict';

// api console:

var _ = require('lodash');

var apidocs = [];

function buildApiConsole() {
    var
        groups = {},
        n = 0;
    _.each(apidocs, function (doc) {
        n++;
        doc.id = 'api-' + n; // unique API ID
        var gs = groups[doc.group] || [];
        gs.push(doc);
        groups[doc.group] = gs;
    });
    return groups;
}

function processApiDoc(group, method, url, doclines) {
    var
        ss = _.map(doclines.split('\n'), function (value) {
            return value.match(/^\s*\*?([\w\W]*)$/)[1].trim();
        }),
        doc = {
            group: group,
            name: '(no name)',
            description: '',
            method: method,
            url: url,
            params: [],
            result: {
                type: '',
                description: ''
            },
            errors: []
        },
        continue_description = true;
    _.each(ss, function (value) {
        var m, param, err;
        if (value.indexOf('@') === 0) {
            continue_description = false;
        }
        if (value.indexOf('@name') === 0) {
            doc.name = value.substring(5).trim();
        } else if (value.indexOf('@param') === 0) {
            m = value.match(/^\@param\s+\{(\w+)\}\s*(\[?)(\w+)\=?(\w*)(\]?)\s*\:?\s*([\w\W]*)$/);
            if (m) {
                param = {
                    type: m[1].toLowerCase(),
                    name: m[3],
                    defaultValue: m[4],
                    optional: m[2] === '[' && m[5] === ']',
                    description: m[6]
                };
                doc.params.push(param);
            } else {
                console.log('WARNING: invalid doc line: ' + value);
            }
        } else if (value.indexOf('@return') === 0) {
            // @return {object} User object.
            m = value.match(/^\@return\s+\{(\w+)\}\s*([\w\W]*)$/);
            if (m) {
                doc.result.type = m[1];
                doc.result.description = m[2].trim();
            } else {
                console.log('WARNING: invalid doc line: ' + value);
            }
        } else if (value.indexOf('@error') === 0) {
            m = value.match(/^\@error\s+\{(\w+\:?\w*)\}\s*([\w\W]*)$/);
            if (m) {
                err = {
                    error: m[1],
                    description: m[2]
                };
                doc.errors.push(err);
            } else {
                console.log('WARNING: invalid doc line: ' + value);
            }
        } else {
            // append description:
            if (continue_description) {
                doc.description = doc.description + value;
            }
        }
    });
    apidocs.push(doc);
}

module.exports = {

    buildApiConsole: buildApiConsole,

    processApiDoc: processApiDoc

};
