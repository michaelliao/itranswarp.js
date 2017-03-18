'use strict';

/**
 * Test i18n.
 */
const
    expect = require('chai').expect,
    i18n = require('../i18n.js');

let translators = i18n.loadI18NTranslators(__dirname + '/test-i18n');

describe('#i18n', () => {

    it('test translate to zh_CN', () => {
        let _ = i18n.createI18N('zh_CN,zh;q=0.5,ja_JP;q=0.2', translators);
        expect(_('Category')).to.equal('分类'); // <-- in zh_CN.json
        expect(_('Author')).to.equal('作者'); // <-- in zh.json
        expect(_('Unknown')).to.equal('Unknown'); // not found
    });

    it('test translate to zh_TW', () => {
        let _ = i18n.createI18N('zh_TW,zh;q=0.5,ja_JP;q=0.2', translators);
        expect(_('Category')).to.equal('分類'); // <-- in zh_TW.json
        expect(_('Author')).to.equal('作者'); // <-- in zh.json
        expect(_('Unknown')).to.equal('Unknown'); // not found
    });
});
