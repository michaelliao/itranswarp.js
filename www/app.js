// application:

const
    isProduction = (process.env.NODE_ENV === 'production'),
    HOSTNAME = require('os').hostname(),
    _ = require('lodash'),
    fs = require('mz/fs'),
    Koa = require('koa'),
    Cookies = require('cookies'),
    bodyParser = require('koa-bodyparser'),
    templating = require('./middlewares/templating'),
    controller = require('./middlewares/controller'),
    authenticate = require('./middlewares/authenticate'),
    restify = require('./middlewares/restify'),
    logger = require('./logger.js'),
    api = require('./api'),
    i18n = require('./i18n'),
    auth = require('./auth'),
    config = require('./config'),
    db = require('./db'),
    constants = require('./constants');

var
    static_prefix = config.cdn.static_prefix,
    activeTheme = config.theme,
    User = db.user;

// global app:
var app = new Koa();

// log request URL:
app.use(async (ctx, next) => {
    logger.info(`will process request: ${ctx.request.method} ${ctx.request.url}...`);
    var
        start = Date.now(),
        execTime;
    try {
        await next();
    } catch (e) {
        logger.error('error process request.', e);
    }
    execTime = Date.now() - start;
    ctx.response.set('X-Response-Time', `${execTime}ms`);
    ctx.response.set('X-Host', HOSTNAME);
});

// static file support:
if (! isProduction) {
    let staticFiles = require('./middlewares/static-files');
    app.use(staticFiles('/static/', __dirname + '/static'));
}

// parse request body:
app.use(bodyParser());

// set i18n filter:
var filters = {
    i18n: function (input) {
        return input;
    },
    min: function (input) {
        if (input <= 60) {
            return input + ' minutes';
        }
        var
            h = parseInt(input / 60),
            m = input % 60;
        return h + ' hours ' + m + ' minutes';
    }
};

// add nunjucks as view:
app.use(templating('view', {
    noCache: !isProduction,
    watch: !isProduction,
    filters: filters
}));

// parse user and bind to ctx.state.__user__:
app.use(authenticate);

// rest support:
app.use(restify());

// load i18n:
const i18nT = i18n.getI18NTranslators('./views/i18n');

// add global state for MVC:
app.use(async (ctx, next) => {
    let
        request = ctx.request,
        response = ctx.response,
        method = request.method,
        path = request.path,
        isApi = path.substring(0, 5) === '/api/';
    // check if login required for management:
    if (path.substring(0, 8) === '/manage/' && path !== '/manage/signin') {
        if (!ctx.state.__user__ || ctx.state.__user__.role > constants.role.CONTRIBUTOR) {
            response.redirect('/manage/signin');
            return;
        }
    }
    if (! isApi) {
        ctx.state._ = i18n.createI18N(request.get('Accept-Language') || 'en', i18nT);
        ctx.state.__static_prefix__ = static_prefix;
        ctx.state.__time__ = Date.now();
        ctx.state.__theme__ = activeTheme;
        ctx.state.__request__ = request;
    }
    await next();
});

// add controller:
app.use(controller());

module.exports = app;
