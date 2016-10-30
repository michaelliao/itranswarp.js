/**
 * Markdown parser.
 */
const
    fs = require('fs'),
    marked = require('marked');

// add plugins:

var headingPlugins = {};
var codePlugins = {};

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
        console.warn('Invalid plugin type: ' + p.type);
    }
    return true;
});

const pluginRenderer = new marked.Renderer();
const ugcRenderer = new marked.Renderer();

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

// export:

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

module.exports = {
    ugcMarkdownToHtml: ugcMarkdownToHtml,
    systemMarkdownToHtml: systemMarkdownToHtml
};
