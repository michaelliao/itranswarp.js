// api console:

var _ = require('lodash');

var apidocs = [];

function buildApiConsole() {
    console.log(JSON.stringify(apidocs, null, '  '));
    var groups = {};
    var n = 0;
    _.each(apidocs, function(doc) {
        doc.id = 'api-' + n; // unique API ID
        var gs = groups[doc.group] || [];
        gs.push(doc);
        groups[doc.group] = gs;
    });
    return groups;
}

function processApiDoc(group, method, url, doclines) {
    var ss = _.map(doclines.split('\n'), function(value) {
        return value.match(/^\s*\*?(.*)$/)[1].trim();
    });
    var doc = {
        group: group,
        name: '(no name)',
        description: '(no description)',
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
            var m = value.match(/^\@param\s+\{([\w\,\s]+)\}\s*(\:?\w+)\s*\-\s*(.*)$/);
            if (m) {
                var ms = m[1].replace(/\s/g,'').split(',');
                var param = {
                    name: m[2],
                    type: ms[1],
                    optional: _.contains(ms, 'optional'),
                    description: m[3].trim()
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
            // TODO:
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
