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
    i18n = require('./i18n'),
    constants = require('./constants'),
    utils = require('./controllers/_utils'),
    api_console = require('./api_console');

// init http server:
var app = express();
var productionMode = 'production' === app.get('env');

// set engine to swig:
app.engine('html', swig.renderFile);

// set i18n filter:
swig.setFilter('i18n', function (input) {
    return input;
});

if (productionMode) {
    // set for production:
    app.enable('trust proxy');
} else {
    // set for development:
    swig.setDefaults({ cache: false });
    app.use('/static', express.static(__dirname + '/static'));
    app.use('/api/', function (req, res, next) {
        setTimeout(function () {
            next();
        }, Math.floor(Math.random() * 50));
    });
}

// set theme functions:

var themePath = 'themes/' + config.theme + '/';

app.use(express.cookieParser());

// set upload dir:
var tmp_upload_dir = '/tmp/itranswarp';
if (!fs.existsSync(tmp_upload_dir)) {
    console.log('creating tmp upload dir: ' + tmp_upload_dir);
    fs.mkdirSync(tmp_upload_dir);
}
app.use(express.urlencoded());
app.use(express.json());
app.use(express.multipart({ keepExtensions: true, uploadDir: tmp_upload_dir }));

// set content type: json for api:
app.use('/api/', function (req, res, next) {
    res.type('application/json');
    next();
});

// auto set current user with each request:
app.use(utils.userIdentityParser);

// load i18n for management:
var i18nForManagement = i18n.getI18NTranslators('./views/manage/i18n');

// check user for manage and theme:
app.use(function (req, res, next) {
    var prefix = req.path.substring(0, 8);
    if (prefix === '/manage/' && req.path !== '/manage/signin') {
        if (req.user && req.user.local && req.user.role <= constants.ROLE_CONTRIBUTOR) {
            res.manage = function (view, model) {
                var m = model || {};
                m.__user__ = req.user;
                m._ = i18n.createI18N(req.get('Accept-Language'), i18nForManagement);
                return res.render(view, m);
            };
            return next();
        }
        return res.redirect('/manage/signin');
    }
    // add theme path to response object:
    res.themePath = themePath;
    next();
});

// api error handling:
app.use(app.router);
app.use(function (err, req, res, next) {
    if (err) {
        if (err instanceof api.APIError) {
            console.log('send api error to client: ' + err.error);
            return res.send(err);
        }
        if (productionMode) {
            console.log('ERROR >>> ' + err);
            return res.send(500, 'Internal Server Error');
        }
    }
    return next(err);
});

// scan all modules:

function loadControllerFilenames() {
    var
        files = fs.readdirSync(__dirname + '/controllers'),
        re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$"),
        jss = _.filter(files, function (f) {
            return re.test(f);
        });
    return _.map(jss, function (f) {
        return f.substring(0, f.length - 3);
    });
}

function loadControllers() {
    var ctrls = {};
    _.each(loadControllerFilenames(), function (filename) {
        ctrls[filename] = require('./controllers/' + filename);
    });
    return ctrls;
}

var controllers = loadControllers();

_.each(controllers, function (ctrl, fname) {
    _.each(ctrl, function (fn, path) {
        var ss, verb, route, docs;
        ss = path.split(' ', 2);
        if (ss.length !== 2) {
            console.log('Not a route definition: ' + path);
            return;
        }
        verb = ss[0];
        route = ss[1];
        if (verb === 'GET') {
            console.log('found: GET ' + route + ' in ' + fname + '.js');
            app.get(route, fn);
        } else if (verb === 'POST') {
            console.log('found: POST ' + route + ' in ' + fname + '.js');
            app.post(route, fn);
        } else {
            console.log('error: Invalid verb: ' + verb);
            return;
        }
        if (route.indexOf('/api/') === 0) {
            docs = fn.toString().match(/[\w\W]*\/\*\*?([\d\D]*)\*?\*\/[\w\W]*/);
            if (docs) {
                api_console.processApiDoc(fname, verb, route, docs[1]);
            } else {
                console.log('WARNING: no api docs found for api: ' + route);
            }
        }
    });
});

var apiGroups = api_console.buildApiConsole();
app.get('/manage/api/', function (req, res, next) {
    return res.manage('manage/api/api_console.html', {
        apis: apiGroups,
        data: '\'' + encodeURIComponent(JSON.stringify(apiGroups)).replace(/\'/g, '\\\'') + '\''
    });
});

app.get('/error', function (req, res, next) {
    next(new Error('test error.'));
});

app.get('/_status', function (req, res, next) {
    var mode = productionMode ? 'Production' : 'Development';
    return res.send('Mode: ' + mode);
});

app.listen(3000);
console.log('Start app on port 3000...');

if (productionMode) {
    process.on('uncaughtException', function (err) {
        console.log('>>>>>> UNCAUGHT EXCEPTION >>>>>> ' + err);
    });
}
