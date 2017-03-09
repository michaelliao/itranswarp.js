/**
 * Markdown parser.
 * 
 * author: Michael Liao
 */
const
    fs = require('fs'),
    marked = require('marked'),
    htmlparser = require('htmlparser2'),
    logger = require('./logger.js');

// add plugins:
var
    headingPlugins = {},
    codePlugins = {};

// load markdown plugins:
fs.readdirSync(__dirname + '/plugins/markdown').filter((f) => {
    return f.endsWith('.js');
}).map((f) => {
    return require(__dirname + '/plugins/markdown/' + f);
}).every((p) => {
    if (p.type === 'heading') {
        headingPlugins[p.plugin] = p.render;
    } else if (p.type === 'code') {
        codePlugins[p.plugin] = p.render;
    } else {
        logger.warn('Invalid plugin type: ' + p.type);
    }
    return true;
});

const
    pluginRenderer = new marked.Renderer(),
    ugcRenderer = new marked.Renderer();

// for heading plugins:
pluginRenderer.heading = function (text, level, raw) {
    // find syntax like 'XXX:xxxx':
    var n = raw.indexOf(':');
    if (n > 0) {
        var plugin = raw.substring(0, n);
        var rest = raw.substring(n + 1);
        var render = headingPlugins[plugin];
        if (render) {
            return render(rest);
        }
    }
    var name = encodeURIComponent(text.replace(/\s+/g, '-')).replace(/[^\w]+/g, '-');
    return '<h' + level + '><a name="#' + name + '"></a>' + text + '</h' + level + '>\n';
};

// for code plugins:
pluginRenderer.code = function (code, lang) {
    // find lang in codePlugins:
    var render = codePlugins[lang];
    if (render) {
        return render(code, lang);
    }
    return marked.Renderer.prototype.code.apply(this, arguments);
}

pluginRenderer.link = function (href, title, text) {
    return '<a target="_blank" href="' + href + '">' + text + '</a>';
};

// for ugc:
ugcRenderer.heading = function (text, level, raw) {
    return '<h' + level + '>' + text + '</h' + level + '>\n';
};

ugcRenderer.link = function (href, title, text) {
    if (href.indexOf('http://') !== 0 && href.indexOf('https://') !== 0) {
        href = 'http://' + href;
    }
    return '<a target="_blank" rel="nofollow" href="' + href + '">' + text + '</a>';
};

function ugcMarkdownToHtml(mdText) {
    return marked(mdText, {
        gfm: true,
        sanitize: true,
        renderer: ugcRenderer
    });
}

function systemMarkdownToHtml(mdText) {
    return marked(mdText, {
        gfm: true,
        sanitize: false,
        renderer: pluginRenderer
    });
}

// html -> text:

var HTML2TEXT_TAGS = {
    'applet': ' ',
    'area': ' ',
    'audio': '\n',
    'base': ' ',
    'basefont': '',
    'br': '\n',
    'button': ' ',
    'canvas': ' ',
    'cite': ' ',
    'col': ' ',
    'colgroup': ' ',
    'datalist': ' ',
    'dialog': ' ',
    'embed': ' ',
    'frame': '',
    'frameset': '',
    'head': '',
    'hr': '\n',
    'iframe': '',
    'img': ' ',
    'input': ' ',
    'kbd': ' ',
    'keygen': ' ',
    'link': ' ',
    'map': ' ',
    'meta': ' ',
    'meter': ' ',
    'noframes': ' ',
    'noscript': ' ',
    'object': ' ',
    'optgroup': ' ',
    'option': ' ',
    'output': ' ',
    'param': ' ',
    'progress': ' ',
    'script': '\n',
    'select': ' ',
    'source': ' ',
    'style': ' ',
    'textarea': ' ',
    'track': ' ',
    'var': ' ',
    'video': '\n',
    'wbr': '\n'
};

function htmlToText(html) {
    var
        buffer = [],
        saveTexts = [true],
        saveCurrent = true,
        parser = new htmlparser.Parser({
            onopentag: function (tagname, attribs) {
                if (saveCurrent) {
                    saveCurrent = !HTML2TEXT_TAGS[tagname];
                }
                saveTexts.push(saveCurrent);
            },
            ontext: function (text) {
                if (saveCurrent) {
                    buffer.push(text);
                }
            },
            onclosetag: function (tagname) {
                saveTexts.pop();
                saveCurrent = saveTexts[saveTexts.length - 1];
                buffer.push('\n');
            }
        }, {
            decodeEntities: true
        });
    parser.write(html);
    parser.end();
    return buffer.join('').replace(/\n\n/ig, '\n');
}

module.exports = {
    ugcMarkdownToHtml: ugcMarkdownToHtml,
    systemMarkdownToHtml: systemMarkdownToHtml,
    htmlToText: htmlToText
};
