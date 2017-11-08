'use strict';

/**
 * Application object.
 * 
 * @author Michael Liao
 */

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
    auth = require('./auth'),
    config = require('./config'),
    db = require('./db'),
    cache = require('./cache'),
    constants = require('./constants'),
    i18n = require('./i18n'),
    i18nTranslators = i18n.loadI18NTranslators('./views/i18n'),
    static_prefix = config.cdn.static_prefix,
    SECURE = config.session.https,
    ANTI_SPIDER = config.spider.antiSpider,
    SPIDER_WHITELIST = config.spider.whiteList,
    ACTIVE_THEME = config.theme;

function loadVersion() {
    try {
        let ver = require('./version');
        return ver;
    } catch (e) {
        logger.warn('failed to load version.');
        return Date.now();
    }
}

logger.info(`init app: production mode = ${isProduction}`);

// global app:
let app = new Koa();

app.proxy = config.proxy;

process.isProduction = isProduction;
process.appVersion = loadVersion();

function getRequestIp(ctx) {
    let ipAddr = ctx.headers['x-real-ip'];
    if (ipAddr) {
        return ipAddr;
    }
    ipAddr = ctx.headers['x-forwarded-for']
    if (ipAddr) {
        let n = ipAddr.indexOf(',');
        if (n > 0) {
            return ipAddr.substring(0, n);
        }
        return ipAddr;
    }
    return ctx.ip;
}

function isBot(ua, headers) {
    for (let bot of SPIDER_WHITELIST) {
        if (ua.indexOf(bot) >= 0) {
            logger.info(`detect bot: ${ua} headers: ${JSON.stringify(headers)}`);
            return true;
        }
    }
    return false;
}

function serviceUnavailable(ctx) {
    ctx.response.status = 503;
    ctx.response.body = '<html><body><h1>503 Service Unavailable</h1></body></html>';
}

// log request URL:
app.use(async (ctx, next) => {
    let
        start = Date.now(),
        ipAddr = getRequestIp(ctx);
    if (ANTI_SPIDER > 0) {
        let
            path = ctx.request.path,
            ua = (ctx.request.headers['user-agent'] || '').toLowerCase();
        if (path.startsWith('/blog/')) {
            logger.warn(`deny bad bot: ${ipAddr}: ${ua}`);
            await cache.set(ipAddr, 9999);
            return serviceUnavailable(ctx);
        }
        if (path === '/' || path.startsWith('/wiki') || path.startsWith('/article') || path.startsWith('/discuss') || path.startsWith('/category') || path.startsWith('/webpage')) {
            if (! isBot(ua, ctx.request.headers)) {
                if (ua.indexOf('mozilla') === (-1)) {
                    logger.warn(`deny bot without mozilla: ${ipAddr}: ${ua}`);
                    return serviceUnavailable(ctx);
                }
                let atsp = ctx.cookies.get('atsp');
                if (atsp) {
                    let sp = parseInt(atsp);
                    logger.info(`check now=${start}, sp=${sp}, atsp=${atsp}...`);
                    if (isNaN(sp) || (sp < (start - 800000)) || (sp > (start + 60000))) {
                        logger.warn(`deny bot with bad atsp: now=${start}, atsp=${atsp}, diff=${(start-sp)/1000}: ${ipAddr}: ${ua}`);
                        ctx.cookies.set('atsp', '0', {
                            path: '/',
                            httpOnly: false,
                            secure: SECURE,
                            expires: new Date(0)
                        });
                        //return serviceUnavailable(ctx);
                    }
                } else {
                    let n = await cache.incr(ipAddr);
                    if (n > 2) {
                        logger.warn(`potential bot: n=${n}: ${ipAddr} ${ua}`);
                        if (n > ANTI_SPIDER) {
                            logger.warn(`deny bot: ${n} times: ${ipAddr} ${ua}`);
                            return serviceUnavailable(ctx);
                        }
                    }
                }
            }
        }
    }
    logger.info(`will process request: ${ipAddr}, ${JSON.stringify(ctx.headers)} ${ctx.request.method} ${ctx.request.url}...`);
    try {
        await next();
    } catch (e) {
        logger.error('error process request.', e);
    }
    logger.info(`Response: ${ctx.response.status}`);
    let execTime = Date.now() - start;
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

// set filter:
let filters = {
    json: (input) => {
        return JSON.stringify(input);
    },
    min: function (input) {
        if (input <= 60) {
            return input + ' minutes';
        }
        let
            h = parseInt(input / 60),
            m = input % 60;
        return h + ' hours ' + m + ' minutes';
    }
};

// add nunjucks as view:
app.use(templating('views', {
    noCache: !isProduction,
    watch: !isProduction,
    filters: filters
}));

// parse user and bind to ctx.state.__user__:
app.use(authenticate);

// rest support:
app.use(restify());

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
        ctx.state._ = i18n.createI18N(request.get('Accept-Language') || 'en', i18nTranslators);
        ctx.state.__static_prefix__ = static_prefix;
        ctx.state.__time__ = Date.now();
        ctx.state.__theme__ = ACTIVE_THEME;
        ctx.state.__request__ = request;
    }
    await next();
    if (ctx.status === 404) {
        response.redirect('/404');
    }
});

// add controller:
app.use(controller());

module.exports = app;
