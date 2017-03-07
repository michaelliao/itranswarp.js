// application:

const
    isProduction = (process.env.NODE_ENV === 'production'),
    HOSTNAME = require('os').hostname(),
    _ = require('lodash'),
    fs = require('mz/fs'),
    Koa = require('koa'),
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
    constants = require('./constants'),
    db = require('./db'),
    api_console = require('./api_console');

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

// rest support:
app.use(restify());

// parse user and bind to ctx.state.__user__:
app.use(authenticate());

// add controller:
app.use(controller());

// load i18n:
var i18nT = i18n.getI18NTranslators('./views/i18n.json');

// add controller:
app.use(controller());







var isDevelopment = !process.productionMode;





app.use(function* theMiddleware(next) {
    var
        request = this.request,
        response = this.response,
        method = request.method,
        path = request.path,
        prefix8 = path.substring(0, 8),
        prefix4 = path.substring(0, 4),
        start = Date.now(),
        execTime,
        isApi = path.indexOf('/api/') === 0;
    console.log('[%s] %s %s', new Date().toISOString(), method, path);

    if (prefix8 === '/manage/' && request.path !== '/manage/signin') {
        if (!request.user || request.user.role > constants.role.CONTRIBUTOR) {
            response.redirect('/manage/signin');
            return;
        }
    }

    if (isApi) {
        if (isDevelopment) {
            console.log('[API Request]');
            logJSON(request.body);
        }
    }
    else {
        this.render = function (templ, model) {
            model._ = i18n.createI18N(request.get('Accept-Language') || 'en', i18nT);
            model.__static_prefix__ = static_prefix;
            model.__user__ = request.user;
            model.__time__ = Date.now();
            model.__theme__ = activeTheme;
            model.__request__ = request;
            var renderedHtml = swig.renderFile(swigTemplatePath + templ, model);
            response.body = renderedHtml;
            response.type = '.html';
        };
    }
    try {
        yield next;
        execTime = String(Date.now() - start);
        response.set('X-Cluster-Node', hostname);
        response.set('X-Execution-Time', execTime);
        console.log('X-Execution-Time: ' + execTime);
        if (response.status === 404) {
            this.throw(404);
        }
    }
    catch (err) {
        execTime = String(Date.now() - start);
        response.set('X-Execution-Time', execTime);
        console.log('X-Execution-Time: ' + execTime);
        console.log('[Error] error when handle url: ' + request.path);
        console.log(err.stack);
        response.set('X-Execution-Time', String(Date.now() - start));
        if (err.code && err.code === 'POOL_ENQUEUELIMIT') {
            // force kill node process:
            console.error(new Date().toISOString() + ' [FATAL] POOL_ENQUEUELIMIT, process exit 1.');
            process.exit(1);
        }
        if (isApi) {
            // API error:
            response.body = {
                error: err.error || (err.status === 404 ? '404' : '500'),
                data: err.data || '',
                message: err.status === 404 ? 'API not found.' : (err.message || 'Internal error.')
            };
        }
        else if (err.status === 404 || err.error === 'entity:notfound') {
            response.body = '404 Not Found'; //this.render('404.html', {});
        }
        else {
            console.error(new Date().toISOString() + ' [ERROR] 500 ', err.stack);
            response.body = '500 Internal Server Error'; //this.render('500.html', {});
        }
        if (execTime > 1000) {
            console.error(new Date().toISOString() + ' [ERROR] X-Execution-Time too long: ' + execTime);
        }
    }
    if (isApi) {
        if (isDevelopment) {
            console.log('[API Response]');
            logJSON(response.body);
        }
    }
});

app.listen(2015);

console.log(`application start in ${process.isProductionMode ? 'production' : 'development'} mode at 2015...`);
