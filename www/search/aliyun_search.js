// aliyun_search.js

var
    _ = require('lodash'),
    crypto = require('crypto'),
    uuid = require('uuid/v4'),
    request = require('request');

var
    VERSION = 'v2',
    SIGNATURE_METHOD = 'HMAC-SHA1',
    SIGNATURE_VERSION = '1.0';

function encode(s) {
    var r = encodeURIComponent(s);
    return r.replace(/\'/g, '%27').replace(/\*/g, '%2A').replace(/\!/g, '%21').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function nonce() {
    return uuid();
}

function filter(f) {
    if (typeof f === 'string') {
        return f;
    }
    return f.field + '=\"' + f.value + '\"';
}

function utcNow() {
    var
        d = new Date(),
        YY = d.getUTCFullYear(),
        MM = d.getUTCMonth() + 1,
        DD = d.getUTCDate(),
        hh = d.getUTCHours(),
        mm = d.getUTCMinutes(),
        ss = d.getUTCSeconds();
    return YY + '-' +
        (MM < 10 ? '0' : '') + MM + '-' +
        (DD < 10 ? '0' : '') + DD + 'T' +
        (hh < 10 ? '0' : '') + hh + ':' +
        (mm < 10 ? '0' : '') + mm + ':' +
        (ss < 10 ? '0' : '') + ss + 'Z';
}

function createSearchEngine(cfg) {
    var
        appName = cfg.app_name,
        tableName = cfg.table_name,
        baseSearchUrl = 'http://opensearch.aliyuncs.com/search',
        baseIndexUrl = 'http://opensearch.aliyuncs.com/index/doc/' + appName,
        accessKeyId = cfg.access_key_id,
        accessKeySecret = cfg.access_key_secret + '&',
        makeSignature = function (method, query) {
            // create new query strings with attached signature info:
            var qs, items, arr, stringToSign, hmac, signature;
            qs = _.clone(query);
            qs.Version = VERSION;
            qs.AccessKeyId = accessKeyId;
            qs.SignatureMethod = SIGNATURE_METHOD;
            qs.SignatureVersion = SIGNATURE_VERSION;
            qs.SignatureNonce = nonce();
            qs.Timestamp = utcNow();
            // exclude items when sign:
            if (qs.sign_mode === '1') {
                items = qs.items;
                delete qs.items;
            }
            // build string to sign:
            arr = _.map(qs, function (value, key) {
                return key + '=' + encode(value);
            });
            arr.sort();
            stringToSign = arr.join('&')
            // sign it:
            hmac = crypto.createHmac('sha1', accessKeySecret);
            hmac.update(method + '&%2F&' + encodeURIComponent(stringToSign));
            qs.Signature = hmac.digest('base64');
            // add items:
            if (items) {
                qs.items = items;
            }
            return qs;
        },
        httpRequest = function (method, uri, query, callback) {
            // send http request:
            var
                qs = makeSignature(method, query),
                opt = {
                    method: method,
                    uri: uri,
                    timeout: 5000,
                    followRedirect: false,
                    headers: {
                        'User-Agent': 'node/request+itranswarp.js'
                    }
                };
            if (method === 'GET') {
                opt.qs = qs;
            }
            if (method === 'POST') {
                opt.form = qs;
            }
            request(opt, function (err, res, body) {
                if (err) {
                    console.log('[SEARCH ERROR] ' + err);
                    callback && callback(err);
                    return;
                }
                if (res.statusCode !== 200) {
                    console.log('[SEARCH ERROR] ' + res.statusCode + ': ' + body);
                    callback && callback(new Error('Bad response code: ' + res.statusCode));
                    return;
                }
                var r = null;
                try {
                    r = JSON.parse(body);
                }
                catch (e) {
                    console.log('[SEARCH ERROR] failed in parsing json: ' + body);
                    callback && callback(e);
                    return;
                }
                if (r.status && r.status === 'OK') {
                    callback && callback(null, r);
                    return;
                }
                console.log('[SEARCH ERROR] ' + body);
                callback && callback({ error: r.errors});
            });
        };

    return {
        external: false,
        index: function (docs, callback) {
            console.log('[SEARCH] index docs...');
            if (! Array.isArray(docs)) {
                docs = [docs];
            }
            var qs = {
                sign_mode: '1',
                action: 'push',
                table_name: tableName,
                items: JSON.stringify(_.map(docs, function (doc) {
                    return { cmd: 'ADD', fields: doc };
                }))
            };
            httpRequest('POST', baseIndexUrl, qs, callback);
        },
        unindex: function (docs, callback) {
            console.log('[SEARCH] unindex docs...');
            if (! Array.isArray(docs)) {
                docs = [docs];
            }
            var qs = {
                sign_mode: '1',
                action: 'push',
                table_name: tableName,
                items: JSON.stringify(_.map(docs, function (doc) {
                    return { cmd: 'DELETE', fields: doc};
                }))
            };
            httpRequest('POST', baseIndexUrl, qs, callback);
        },
        search: function (q, options, callback) {
            if (arguments.length === 2) {
                callback = options;
                options = undefined;
            }
            var
                qs,
                config,
                index = options && options.index || 'default',
                query = 'query=' + index + ':\'' + q.replace(/\'/g, ' ') + '\'';
            if (options) {
                if (options.sort) {
                    query = query + '&&sort=' + options.sort;
                }
                if (options.filter) {
                    query = query + '&&filter=' + filter(options.filter);
                }
                if (options.start || options.hit) {
                    query = query + '&&config=format:json'
                    if (options.start) {
                        query = query + ',start:' + options.start;
                    }
                    if (options.hit) {
                        query = query + ',hit:' + options.hit;
                    }
                }
            }
            qs = {
                query: query,
                index_name: appName
            };
            httpRequest('GET', baseSearchUrl, qs, callback);
        }
    }
}

module.exports = {
    createSearchEngine: createSearchEngine
};
