/**
 * Test markdown.
 */
const
    fs = require('fs'),
    expect = require('chai').expect,
    md = require('../md.js');

describe('#md', () => {

    it('#ugcMarkdownToHtml', () => {
        expect(md.ugcMarkdownToHtml('# Hello<')).to.equal('<h1>Hello&lt;</h1>\n');
        expect(md.ugcMarkdownToHtml('* A\n* B\n* C')).to.equal('<ul>\n<li>A</li>\n<li>B</li>\n<li>C</li>\n</ul>\n');
        expect(md.ugcMarkdownToHtml('Hello, <HTML>!')).to.equal('<p>Hello, &lt;HTML&gt;!</p>\n');
        expect(md.ugcMarkdownToHtml('<a href="/">Index</a>')).to.equal('<p>&lt;a href=&quot;/&quot;&gt;Index&lt;/a&gt;</p>\n');
        expect(md.ugcMarkdownToHtml('<script>alert()</script>')).to.equal('<p>&lt;script&gt;alert()&lt;/script&gt;</p>\n');
    });

    it('#systemMarkdownToHtml', () => {
        expect(md.systemMarkdownToHtml('# Hello 你好')).to.equal('<h1><a name="#Hello-E4-BD-A0-E5-A5-BD"></a>Hello 你好</h1>\n');
        expect(md.systemMarkdownToHtml('<script>alert("OK!")</script>')).to.equal('<script>alert("OK!")</script>');
        expect(md.systemMarkdownToHtml('```\nNormal\nCODE\n```')).to.equal('<pre><code>Normal\nCODE\n</code></pre>');
    });

    it('#plugin:video', () => {
        expect(md.systemMarkdownToHtml('# video:/static/a.mp4')).to.equal('<video width="100%" controls><source src="/static/a.mp4"></video>\n');
        expect(md.systemMarkdownToHtml('# video: http://cdn.com/static/a.mp4 ')).to.equal('<video width="100%" controls><source src="http://cdn.com/static/a.mp4"></video>\n');
        expect(md.systemMarkdownToHtml('# video: /a.mp4, /b.mp4 ')).to.equal('<video width="100%" controls><source src="/a.mp4"><source src="/b.mp4"></video>\n');
    });

    it('#plugin:js-test', () =>{
        var code = '``` js-practice\nvar x=0; // x < 1\n----\nvar y=x;\n```';
        var gen = md.systemMarkdownToHtml(code);
        expect(gen.indexOf('<form id=')>0).to.be.true;
        expect(gen.indexOf('// x &lt; 1')>0).to.be.true;
    });
});
