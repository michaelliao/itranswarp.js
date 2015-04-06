'use strict';

// test utils:

var fs = require('fs');

var should = require('should');

var utils = require('../controllers/_utils');

var formatTags = utils.formatTags;

describe('#utils', function () {

    it('#formatTags', function () {
        var tags = {
            '   '             : '',
            '   ,  '          : '',
            ' A,B  ,C  , '    : 'A,B,C',
            ',,A;B;C ,  '     : 'A,B,C',
            ' Abc, abc, A B'  : 'Abc,A B',
            '  R&D, R & D  '  : 'R&D,R & D',
            'a-b-c d-e-f,'    : 'a-b-c d-e-f'
        }
        formatTags('  ABC, def, ha ha ').should.equal('ABC,def,ha ha');
    });

    it('#page', function () {
        var pages = [
            // index, perPage, total, pages, offset:
            [ 1,  undefined, 81,   5,  0],
            [ 2,  undefined, 99,   5,  20],
            [ 3,  undefined, 100,  5,  40],
            [ 1,  undefined, 101,  6,  0],
            [ 1,  undefined, 101,  6,  0],
            [ 1,  10,        5,    1,  0],
            [ 10, 10,        99,   10, 90]
        ];
        for (var i=0; i<pages.length; i++) {
            var data = pages[i];
            var
                pageIndex = data[0],
                itemsPerPage = data[1],
                totalItems = data[2],
                totalPages = data[3],
                offset = data[4];
            var page = utils.page(pageIndex, itemsPerPage);
            page.totalItems = totalItems;
            page.totalPages.should.equal(totalPages);
            page.offset.should.equal(offset);
        }
    });

    it('#html2text', function () {
        var i, html, r = [
            '     heading 3     this is line1     this is line2          this is line3     this is input & checkbox.          footer       ',
            '     <script>     Hi!     we are sorry...          OK.',
            '     Test     Download from http://www.example.com/abc/xyz/100(100 MB).              item 1         item 2               大家好！                              this is line3     this is input          END       ',
            '现在，你已经学会了修改文件，然后把修改提交到Git版本库，现在，再练习一次，修改readme.txt文件如下： Git is a distributed version control system. Git is free software distributed under the GPL. 然后尝试提交： $ git add readme.txt $ git commit -m \"append GPL\" [master 3628164] append GPL 1 file changed, 1 insertion(+), 1 deletion(-) 像这样，你不断对文件进行修改，然后不断提交修改到版本库里，就好比玩RPG游戏时，每通过一关就会自动把游戏状态存盘，如果某一关没过去，你还可以选择读取前一关的状态。有些时候，在打Boss之前，你会手动存盘，以便万一打Boss失败了，可以从最近的地方重新开始。Git也是一样，每当你觉得文件修改到一定程度的时候，就可以“保存一个快照”，这个快照在Git中被称为commit。一旦你把文件改乱了，或者误删了文件，还可以从最近的一个commit恢复，然后继续工作，而不是把几个月的工作成果全部丢失。 现在，我们回顾一下readme.txt文件一共有几个版本被提交到Git仓库里了： 版本1：wrote a readme file Git is a version control system. Git is free software. 版本2：add distributed Git is a distributed version control system. Git is free software. 版本3：append GPL Git is a distributed version control system. Git is free software distributed under the GPL. 当然了，在实际工作中，我们脑子里怎么可能记得一个几千行的文件每次都改了什么内容，不然要版本控制系统干什么。版本控制系统肯定有某个命令可以告诉我们历史记录，在Git中，我们用git log命令查看： '
        ];
        for (i = 0; i < 4; i++) {
            html = fs.readFileSync('./test/res-html-' + i + '.html', {encoding: 'UTF-8'});
            utils.html2text(html).should.equal(r[i]);
        }
    });
});
