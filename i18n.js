// i18n support:

var
    _ = require('lodash'),
    fs = require('fs');

var RE_I18N_FILENAME = /^(\w+)\.json$/;

function loadI18NFile(filePath) {
    console.log('Load i18n file: ' + filePath);
    var dict;
    try {
        dict = require(filePath);
    }
    catch (e) {
        console.log(e);
        return null;
    }
    var i18n = {};
    _.each(dict, function(value, key) {
        if (typeof(key)==='string' && typeof(value)==='string') {
            console.log('i18n: ' + key + ' -> ' + value);
            i18n[key] = value;
        }
        else {
            console.log('[INVALID] i18n: ' + key + ' -> ' + value);
        }
    });
    return i18n;
}

function getI18NTranslators(path) {
    var files = fs.readdirSync(path);
    var i18nFiles = _.filter(files, function(f) {
        return RE_I18N_FILENAME.test(f);
    });
    var locales = {};
    _.each(i18nFiles, function(jsonFile) {
        var d = loadI18NFile(path + '/' + jsonFile);
        if (d!==null) {
            // load successfully:
            var locale = jsonFile.match(RE_I18N_FILENAME)[1];
            console.log('Locale ' + locale + ' loaded.');
            locales[locale.toLowerCase()] = d;
        }
    });
    console.log(JSON.stringify(locales));
    return locales;
}

function getTranslator(header, translators) {
    // header like: zh-CN,zh;q=0.8,en;q=0.6,en-US;q=0.4,ru;q=0.2,zh-TW;q=0.2
    header = header.toLowerCase().replace(/\-/g, '_');
    var
        i, j, s, n,
        ss = header.split(',');
    for (i = 0; i < ss.length; i ++) {
        s = ss[i].trim();
        n = s.indexOf(';');
        if (n!==(-1)) {
            s = s.substring(0, n).trim();
        }
        if (s in translators)
        {
            return translators[s];
        }
    }
    return null;
}

function noTranslate(s)
{
    return s;
}

function createI18N(header, translators)
{
    var translator = getTranslator(header, translators);
    if (translator===null) {
        return noTranslate;
    }
    return function(s) {
        console.log(s + ' ==> ' + translator[s]);
        return translator[s] || s;
    };
}

exports = module.exports = {

    createI18N: createI18N,

    getI18NTranslators: getI18NTranslators,

};
