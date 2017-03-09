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
        expect(md.ugcMarkdownToHtml('[hello](http://test.com/)')).to.equal('<p><a target="_blank" rel="nofollow" href="http://test.com/">hello</a></p>\n');
        expect(md.ugcMarkdownToHtml('[hello](test)')).to.equal('<p><a target="_blank" rel="nofollow" href="http://test">hello</a></p>\n');
        expect(md.ugcMarkdownToHtml('<a href="/" onclick="alert()">Index</a>')).to.equal('<p>&lt;a href=&quot;/&quot; onclick=&quot;alert()&quot;&gt;Index&lt;/a&gt;</p>\n');
        expect(md.ugcMarkdownToHtml('<script>alert()</script>')).to.equal('<p>&lt;script&gt;alert()&lt;/script&gt;</p>\n');
        expect(md.ugcMarkdownToHtml('<iframe src="http://host/"></iframe>')).to.equal('<p>&lt;iframe src=&quot;http://host/&quot;&gt;&lt;/iframe&gt;</p>\n');
    });

    it('#systemMarkdownToHtml', () => {
        expect(md.systemMarkdownToHtml('# Hello 你好')).to.equal('<h1><a name="#Hello-E4-BD-A0-E5-A5-BD"></a>Hello 你好</h1>\n');
        expect(md.systemMarkdownToHtml('[hello](http://test.com/)')).to.equal('<p><a target="_blank" href="http://test.com/">hello</a></p>\n');
        expect(md.systemMarkdownToHtml('[hello](test)')).to.equal('<p><a target="_blank" href="test">hello</a></p>\n');
        expect(md.systemMarkdownToHtml('<script>alert("OK!")</script>')).to.equal('<script>alert("OK!")</script>');
        expect(md.systemMarkdownToHtml('```\nNormal\nCODE\n```')).to.equal('<pre><code>Normal\nCODE\n</code></pre>');
        expect(md.systemMarkdownToHtml('<iframe src="http://host/"></iframe>')).to.equal('<iframe src="http://host/"></iframe>');
    });

    it('#plugin:video', () => {
        expect(md.systemMarkdownToHtml('# video:/static/a.mp4')).to.equal('<video width="100%" controls><source src="/static/a.mp4"></video>\n');
        expect(md.systemMarkdownToHtml('# video: http://cdn.com/static/a.mp4 ')).to.equal('<video width="100%" controls><source src="http://cdn.com/static/a.mp4"></video>\n');
        expect(md.systemMarkdownToHtml('# video: /a.mp4, /b.mp4 ')).to.equal('<video width="100%" controls><source src="/a.mp4"><source src="/b.mp4"></video>\n');
    });

    it('#plugin:js-test', () => {
        var code = '``` js-practice\nvar x=0; // x < 1\n----\nvar y=x;\n```';
        var gen = md.systemMarkdownToHtml(code);
        expect(gen.indexOf('<form id=')>0).to.be.true;
        expect(gen.indexOf('// x &lt; 1')>0).to.be.true;
    });

    it('#html2text', () => {
        expect(md.htmlToText('<h1>heading</h1><br><p>hello&amp;world</p>')).to.equal('heading\nhello&world\n');
        expect(md.htmlToText('<span><script>alert("hi")</script>hello</span>')).to.equal('\nhello\n');
        expect(md.htmlToText('<pre>haha\nhehe</pre>')).to.equal('haha\nhehe\n');
        expect(md.htmlToText('<p>not well-formed</div>')).to.equal('not well-formed\n');
    });
});
