'use strict';

// i18n support:

var
    _ = require('lodash'),
    fs = require('fs');

var RE_I18N_FILENAME = /^(\w+)\.json$/;

function loadI18NFile(filePath) {
    console.log('Load i18n file: ' + filePath);
    var dict, i18n = {};
    try {
        dict = require(filePath);
    } catch (e) {
        console.log(e);
        return null;
    }
    _.each(dict, function (value, key) {
        if (typeof key === 'string' && typeof value === 'string') {
            i18n[key] = value;
        } else {
            console.log('[INVALID] i18n: ' + key + ' -> ' + value);
        }
    });
    return i18n;
}

function getI18NTranslators(path) {
    var
        locales = {},
        files = fs.readdirSync(path),
        i18nFiles = _.filter(files, function (f) {
            return RE_I18N_FILENAME.test(f);
        });
    _.each(i18nFiles, function (jsonFile) {
        var locale, d = loadI18NFile(path + '/' + jsonFile);
        if (d !== null) {
            // load successfully:
            locale = jsonFile.match(RE_I18N_FILENAME)[1];
            console.log('Locale ' + locale + ' loaded.');
            locales[locale.toLowerCase()] = d;
        }
    });
    return locales;
}

function getTranslator(header, translators) {
    // header like: zh-CN,zh;q=0.8,en;q=0.6,en-US;q=0.4,ru;q=0.2,zh-TW;q=0.2
    header = header.toLowerCase().replace(/\-/g, '_');
    var
        i, s, n, ss = header.split(',');
    for (i = 0; i < ss.length; i++) {
        s = ss[i].trim();
        n = s.indexOf(';');
        if (n !== (-1)) {
            s = s.substring(0, n).trim();
        }
        if (translators.hasOwnProperty(s)) {
            return translators[s];
        }
    }
    return null;
}

function noTranslate(s) {
    return s;
}

function createI18N(header, translators) {
    var translator = getTranslator(header, translators);
    if (translator === null) {
        return noTranslate;
    }
    return function (s) {
        var trans = translator[s];
        if (!trans) {
            console.log(s + ' ==> (missing)');
        }
        return trans || s;
    };
}

module.exports = {

    createI18N: createI18N,

    getI18NTranslators: getI18NTranslators

};
