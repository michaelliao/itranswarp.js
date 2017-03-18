'use strict';

// i18n support:

const
    _ = require('lodash'),
    fs = require('fs'),
    logger = require('./logger'),
    RE_I18N_FILENAME = /^(\w+)\.json$/;

function _loadI18NFileAsMap(filePath) {
    logger.info('Load i18n file: ' + filePath);
    let
        i18n = new Map(),
        dict = require(filePath);
    _.each(dict, (value, key) => {
        if (typeof key === 'string' && typeof value === 'string') {
            i18n.set(key, value);
        } else {
            logger.warn('[INVALID] i18n: ' + key + ' -> ' + value);
        }
    });
    return i18n;
}

/**
 * return Map:
 * key = locale, string.
 * value = translate Map.
 */
function loadI18NTranslators(path) {
    let
        locales = new Map(),
        i18nFiles = fs.readdirSync(path).filter((f) => {
            return RE_I18N_FILENAME.test(f);
        });
    i18nFiles.forEach((jsonFile) => {
        let
            i18n = _loadI18NFileAsMap(path + '/' + jsonFile),
            locale = jsonFile.match(RE_I18N_FILENAME)[1];
        logger.info('Locale ' + locale + ' loaded.');
        locales.set(locale.toLowerCase(), i18n);
    });
    return locales;
}

/**
 * Get only suitable translators (array) from 'Accept-Language' header.
 */
function _getSuitableTranslators(acceptHeader, allTranslators) {
    // header like: zh-CN,zh;q=0.8,en;q=0.6,en-US;q=0.4,ru;q=0.2,zh-TW;q=0.2
    let suitables = [];
    acceptHeader.toLowerCase()
        .replace(/\-/g, '_')
        .split(',')
        .map((s) => {
            // "zh;q=0.8" --> "zh"
            s = s.trim();
            let n = s.indexOf(';');
            if (n !== (-1)) {
                s = s.substring(0, n).trim();
            }
            return s;
        }).forEach((locale) => {
            let t = allTranslators.get(locale);
            if (t) {
                suitables.push(t);
            }
        });
    return suitables;
}

function createI18N(acceptHeader, allTranslators) {
    let translators = _getSuitableTranslators(acceptHeader, allTranslators);
    return (s) => {
        for (let translator of translators) {
            let value = translator.get(s);
            if (value) {
                return value;
            }
        }
        return s;
    };
}

module.exports = {

    createI18N: createI18N,

    loadI18NTranslators: loadI18NTranslators

};
