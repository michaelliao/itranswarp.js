// app start entry:

var
    fs = require('fs'),
    express = require('express'),
    swig = require('swig'),
    _ = require('lodash');

// load config:
var
    config = require('./config'),
    api = require('./api'),
    db = require('./db'),
    utils = require('./controllers/_utils'),
    api_console = require('./api_console');

// init http server:
var app = express();

// set engine to swig:
app.engine('html', swig.renderFile);

// set for production:
if ('production' === app.get('env')) {
    app.enable('trust proxy');
}

// set for development:
if ('development' === app.get('env')) {
    swig.setDefaults({ cache: false });
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

// set content type: json for api:
app.use('/api/', function(req, res, next) {
    console.log('set api response type: application/json');
    res.type('application/json');
    next();
});

// auto set current user with each request:
app.use(utils.userIdentityParser);

// api error handling:
app.use(app.router);
app.use(function(err, req, res, next) {
    if (err instanceof api.APIError) {
        console.log('send api error to client: ' + err.error);
        return res.send(err);
    }
    console.log('ERROR >>> ' + JSON.stringify(err));
    next(err);
});

// scan all modules:

function loadControllerFilenames() {
    var files = fs.readdirSync(__dirname + '/controllers');
    var re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$");
    var jss = _.filter(files, function(f) {
        return re.test(f);
    });
    return _.map(jss, function(f) {
        return f.substring(0, f.length - 3);
    });
}

function loadControllers() {
    var ctrls = {};
    _.each(loadControllerFilenames(), function(filename) {
        ctrls[filename] = require('./controllers/' + filename);
    });
    return ctrls;
}

var controllers = loadControllers();

_.each(controllers, function(ctrl, fname) {
    _.each(ctrl, function(fn, path) {
        var ss = path.split(' ', 2);
        if (ss.length != 2) {
            console.log('Not a route definition: ' + path);
            return;
        }
        var verb = ss[0];
        var route = ss[1];
        if (verb=='GET') {
            console.log('found: GET ' + route + ' in ' + fname + '.js');
            app.get(route, fn);
        }
        else if (verb=='POST') {
            console.log('found: POST ' + route + ' in ' + fname + '.js');
            app.post(route, fn);
        }
        else {
            console.log('error: Invalid verb: ' + verb);
            return;
        }
        if (route.indexOf('/api/')==0) {
            var docs = fn.toString().match(/.*\/\*\*?([\d\D]*)\*?\*\/.*/);
            if (docs) {
                api_console.process_api_doc(fname, verb, route, docs[1]);
            }
            else {
                console.log('WARNING: no api docs found for api: ' + route);
            }
        }
    });
});

app.get('/error', function(req, res, next) {
    next(new Error('test error.'));
});

app.listen(3000);
console.log('Start app on port 3000...');
