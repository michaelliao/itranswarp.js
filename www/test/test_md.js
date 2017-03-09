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

    it('#html2text complex', () => {
        var i, html, txt, r = [
            '\n heading 3\n this is line1\n this is line2\n \n this is line3\n this is input\n & checkbox.\n \n footer\n \n',
            '\n <script>\n Hi!\n we are sorry...\n \n OK.\n',
            '\n Test\n Download from http://www.example.com/abc/xyz/100\n(100 MB).\n \n item 1\n item 2\n \n \n 大家好！\n \n skip me\n \n \n \n this is line3\n this is input\n \n END\n \n',
            '现在，你已经学会了修改文件，然后把修改提交到Git版本库，现在，再练习一次，修改readme.txt文件如下：\nGit is a distributed version control system.\nGit is free software distributed under the GPL.\n然后尝试提交：\n$ git add readme.txt\n$ git commit -m \"append GPL\"\n[master 3628164] append GPL\n1 file changed, 1 insertion(+), 1 deletion(-)\n像这样，你不断对文件进行修改，然后不断提交修改到版本库里，就好比玩RPG游戏时，每通过一关就会自动把游戏状态存盘，如果某一关没过去，你还可以选择读取前一关的状态。有些时候，在打Boss之前，你会手动存盘，以便万一打Boss失败了，可以从最近的地方重新开始。Git也是一样，每当你觉得文件修改到一定程度的时候，就可以“保存一个快照”，这个快照在Git中被称为commit。一旦你把文件改乱了，或者误删了文件，还可以从最近的一个commit恢复，然后继续工作，而不是把几个月的工作成果全部丢失。\n现在，我们回顾一下readme.txt文件一共有几个版本被提交到Git仓库里了：\n版本1：wrote a readme file\nGit is a version control system.\nGit is free software.\n版本2：add distributed\nGit is a distributed version control system.\nGit is free software.\n版本3：append GPL\nGit is a distributed version control system.\nGit is free software distributed under the GPL.\n当然了，在实际工作中，我们脑子里怎么可能记得一个几千行的文件每次都改了什么内容，不然要版本控制系统干什么。版本控制系统肯定有某个命令可以告诉我们历史记录，在Git中，我们用git log命令查看：\n'
        ];
        for (i = 0; i < 4; i++) {
            html = fs.readFileSync('./test/res-html-' + i + '.html', {encoding: 'UTF-8'});
            txt = md.htmlToText(html);
            expect(txt).to.equal(r[i]);
        }
    });
});
