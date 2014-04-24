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
            locales[locale] = d;
        }
    });
    return locales;
}

exports = module.exports = {

    getI18NTranslators: getI18NTranslators,

};

getI18NTranslators('./views/manage/i18n');
