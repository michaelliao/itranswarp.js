'use strict';

// test markdown:

const
    fs = require('fs'),
    assert = require('assert'),
    md = require('../md.js');

describe('#md', () => {

    it('#ugcMarkdownToHtml', () => {
        assert.strictEqual(md.ugcMarkdownToHtml('# Hello<'), '<h1>Hello&lt;</h1>\n');
        assert.strictEqual(md.ugcMarkdownToHtml('* A\n* B\n* C'), '<ul>\n<li>A</li>\n<li>B</li>\n<li>C</li>\n</ul>\n');
        assert.strictEqual(md.ugcMarkdownToHtml('Hello, <HTML>!'), '<p>Hello, &lt;HTML&gt;!</p>\n');
        assert.strictEqual(md.ugcMarkdownToHtml('<a href="/">Index</a>'), '<p>&lt;a href=&quot;/&quot;&gt;Index&lt;/a&gt;</p>\n');
        assert.strictEqual(md.ugcMarkdownToHtml('<script>alert()</script>'), '<p>&lt;script&gt;alert()&lt;/script&gt;</p>\n');
    });

    it('#systemMarkdownToHtml', () => {
        assert.strictEqual(md.systemMarkdownToHtml('# Hello 你好'), '<h1><a name="#Hello-E4-BD-A0-E5-A5-BD"></a>Hello 你好</h1>\n');
        assert.strictEqual(md.systemMarkdownToHtml('<script>alert("OK!")</script>'), '<script>alert("OK!")</script>');
        assert.strictEqual(md.systemMarkdownToHtml('```\nNormal\nCODE\n```'), '<pre><code>Normal\nCODE\n</code></pre>');
    });

    it('#plugin:video', () => {
        assert.strictEqual(md.systemMarkdownToHtml('# video:/static/a.mp4'), '<video width="100%" controls><source src="/static/a.mp4"></video>\n');
        assert.strictEqual(md.systemMarkdownToHtml('# video:http://cdn.com/static/a.mp4'), '<video width="100%" controls><source src="http://cdn.com/static/a.mp4"></video>\n');
    });

    it('#plugin:js-test', () =>{
        var code = '``` js-practice\nvar x=0; // x < 1\n----\nvar y=x;\n```';
        var gen = md.systemMarkdownToHtml(code);
        assert(gen.indexOf('<form id=')>0);
        assert(gen.indexOf('// x &lt; 1')>0);
    });
});
