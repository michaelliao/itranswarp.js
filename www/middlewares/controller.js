/**
 * koa middleware to auto-scan & import controllers under dir 'controllers'.
 * 
 * author: Michael Liao
 */
const
    fs = require('fs'),
    path = require('path'),
    router = require('koa-router'),
    logger = require('../logger');

// add url-route in /controllers:
function _addMapping(router, mapping) {
    for (var url in mapping) {
        if (url.startsWith('GET ')) {
            var path = url.substring(4);
            router.get(path, mapping[url]);
            console.log(`register URL mapping: GET ${path}`);
        } else if (url.startsWith('POST ')) {
            var path = url.substring(5);
            router.post(path, mapping[url]);
            console.log(`register URL mapping: POST ${path}`);
        } else if (url.startsWith('PUT ')) {
            var path = url.substring(4);
            router.put(path, mapping[url]);
            console.log(`register URL mapping: PUT ${path}`);
        } else if (url.startsWith('DELETE ')) {
            var path = url.substring(7);
            router.del(path, mapping[url]);
            console.log(`register URL mapping: DELETE ${path}`);
        } else {
            console.log(`invalid URL: ${url}`);
        }
    }
}

function _addControllers(router, dir) {
    let basedir = path.dirname(__dirname);
    fs.readdirSync(basedir + '/' + dir).filter((f) => {
        return f.endsWith('.js');
    }).forEach((f) => {
        logger.info(`process controller: ${f}...`);
        let mapping = require(basedir + '/' + dir + '/' + f);
        _addMapping(router, mapping);
    });
}

module.exports = function (dir='controllers') {
    let rt = router();
    _addControllers(rt, dir);
    return rt.routes();
};
