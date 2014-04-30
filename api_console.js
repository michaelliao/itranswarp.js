// api console:

var _ = require('lodash');

var apidocs = [];

function buildApiConsole() {
    console.log(JSON.stringify(apidocs, null, '  '));
    var groups = {};
    var n = 0;
    _.each(apidocs, function(doc) {
        n ++;
        doc.id = 'api-' + n; // unique API ID
        var gs = groups[doc.group] || [];
        gs.push(doc);
        groups[doc.group] = gs;
    });
    console.log(JSON.stringify(groups, null, '  '));
    return groups;
}

function processApiDoc(group, method, url, doclines) {
    var ss = _.map(doclines.split('\n'), function(value) {
        return value.match(/^\s*\*?(.*)$/)[1].trim();
    });
    var doc = {
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
    };
    var continue_description = true;
    _.each(ss, function(value) {
        if (value.indexOf('@')===0) {
            continue_description = false;
        }
        if (value.indexOf('@name')===0) {
            doc.name = value.substring(5).trim();
        }
        else if (value.indexOf('@param')===0) {
            var m = value.match(/^\@param\s+\{(\w+)\}\s*(\[?)(\w+)\=?(\w*)(\]?)\s*\:?\s*(.*)$/);
            if (m) {
                var param = {
                    type: m[1].toLowerCase(),
                    name: m[3],
                    defaultValue: m[4],
                    optional: m[2]==='[' && m[5]===']',
                    description: m[6]
                };
                doc.params.push(param);
            }
            else {
                console.log('WARNING: invalid doc line: ' + value);
            }
        }
        else if (value.indexOf('@return')===0) {
            // @return {object} User object.
            var m = value.match(/^\@return\s+\{(\w+)\}\s*(.*)$/);
            if (m) {
                doc.result.type = m[1];
                doc.result.description = m[2].trim();
            }
            else {
                console.log('WARNING: invalid doc line: ' + value);
            }
        }
        else if (value.indexOf('@error')===0) {
            var m = value.match(/^\@error\s+\{(\w+\:?\w*)\}\s*(.*)$/);
            if (m) {
                var err = {
                    error: m[1],
                    description: m[2]
                };
                doc.errors.push(err);
            }
            else {
                console.log('WARNING: invalid doc line: ' + value);
            }
        }
        else {
            // append description:
            if (continue_description) {
                doc.description = doc.description + value;
            }
        }
    });
    apidocs.push(doc);
}

exports = module.exports = {

    buildApiConsole: buildApiConsole,

    processApiDoc: processApiDoc

}
