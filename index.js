// app start entry:

var
    fs = require('fs'),
    express = require('express'),
    ejs = require('ejs'),
    _ = require('underscore');

// load config:
var
    config = require('./config'),
    db = require('./db');

// init http server:
var app = express();

// set engine to ejs:
app.engine('html', ejs.__express);

// set for production:
if ('production' == app.get('env')) {
    app.enable('trust proxy');
}

// set for development:
if ('development' == app.get('env')) {
    app.use('/static', express.static(__dirname + '/static'));
    app.use('/api/', function(req, res, next) {
        setTimeout(function() {
            next(null);
        }, 250 + Math.floor(Math.random() * 250));
    });
}

app.use(express.cookieParser());

// set upload dir:
var tmp_upload_dir = '/tmp/itranswarp';
if (! fs.existsSync(tmp_upload_dir)) {
    console.log('creating tmp upload dir: ' + tmp_upload_dir);
    fs.mkdirSync(tmp_upload_dir);
}
app.use(express.urlencoded());
app.use(express.json());
app.use(express.multipart({ keepExtensions: true, uploadDir: tmp_upload_dir }));

// auto set current user with each request:
app.use(require('./controllers/_utils').extract_session_cookie);

// set content type: json for api:
app.use('/api/', function(req, res, next) {
    res.type('application/json');
    next();
});

function load_controllers() {
    var files = require('fs').readdirSync(__dirname + '/controllers');
    var re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$");
    var jss = _.filter(files, function(f) {
        return re.test(f);
    });
    return _.map(jss, function(f, index, list) {
        return f.substring(0, f.length - 3);
    });
}

// scan all modules:

function process_api_doc(method, url, doclines) {
    var ss = _.map(doclines.split('\n'), function(value, index, list) {
        return value.match(/^\s*\*?(.*)$/)[1].trim();
    });
    var doc = {
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
    _.each(ss, function(value, index, list) {
        if (value.indexOf('@')==0) {
            continue_description = false;
        }
        if (value.indexOf('@param')==0) {
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
        else if (value.indexOf('@return')==0) {
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
        else if (value.indexOf('@error')==0) {
            // TODO:
        }
        else {
            // append description:
            if (continue_description) {
                doc.description = doc.description + value;
            }
        }
    });
    return doc;
}

var apidocs = [];

_.each(load_controllers(), function(app_mod, index, list) {
    var mod = require(__dirname + '/controllers/' + app_mod);
    _.each(mod, function(fn, path, obj) {
        var ss = path.split(' ', 2);
        if (ss.length != 2) {
            console.log('ERROR in route definition: ' + path);
            return;
        }
        var verb = ss[0];
        var route = ss[1];
        if (verb=='GET') {
            console.log('Found api: GET ' + route + ' in ' + app_mod + '.js');
            app.get(route, fn);
        }
        else if (verb=='POST') {
            console.log('Found api: POST ' + route + ' in ' + app_mod + '.js');
            app.post(route, fn);
        }
        else if (verb=='USE') {
            console.log('Found a middleware: ' + route + ' in ' + app_mod + '.js');
            app.use(route, fn);
            return;
        }
        else {
            console.log('Error: Invalid verb: ' + verb);
            return;
        }
        if (route.indexOf('/api/')==0) {
            var docs = fn.toString().match(/.*\/\*\*?([\d\D]*)\*?\*\/.*/);
            if (docs) {
                var apidoc = process_api_doc(verb, route, docs[1]);
            }
            else {
                console.log('WARNING: no api docs found for api: ' + route);
            }
        }
    });
});

app.listen(3000);
console.log('Start app on port 3000...');
