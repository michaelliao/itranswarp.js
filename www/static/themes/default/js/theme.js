// itranswarp.js

// JS Template:

function Template(tpl) {
    var
        fn,
        match,
        code = ['var r=[];\nvar _html = function (str) { return str.replace(/&/g, \'&amp;\').replace(/"/g, \'&quot;\').replace(/\'/g, \'&#39;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\'); };'],
        re = /\{\s*([a-zA-Z\.\_0-9()]+)(\s*\|\s*safe)?\s*\}/m,
        addLine = function (text) {
            code.push('r.push(\'' + text.replace(/\'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '\');');
        };
    while (match = re.exec(tpl)) {
        if (match.index > 0) {
            addLine(tpl.slice(0, match.index));
        }
        if (match[2]) {
            code.push('r.push(String(this.' + match[1] + '));');
        }
        else {
            code.push('r.push(_html(String(this.' + match[1] + ')));');
        }
        tpl = tpl.substring(match.index + match[0].length);
    }
    addLine(tpl);
    code.push('return r.join(\'\');');
    fn = new Function(code.join('\n'));
    this.render = function (model) {
        return fn.apply(model);
    };
}

// load topics as comments:

var
    tplComment = null,
    tplCommentInfo = null;

function buildComments(data) {
    if (tplComment === null) {
        tplComment = new Template($('#tplComment').html());
    }
    if (tplCommentInfo === null) {
        tplCommentInfo = new Template($('#tplCommentInfo').html());
    }
    if (data.topics.length === 0) {
        return '<p>No comment yet.</p>';
    }
    var i, j, topic, reply, s, L = [], page = data.page;
    for (i=0; i<data.topics.length; i++) {
        topic = data.topics[i];
        L.push('<li>');
        L.push(tplComment.render(topic));
        L.push('<ul>')
        if (topic.replies.length > 0) {
            for (j=0; j<topic.replies.length; j++) {
                reply = topic.replies[j];
                L.push('<li>');
                L.push(tplComment.render(reply));
                L.push('</li>');
            }
        }
        L.push(tplCommentInfo.render(topic));
        L.push('</ul>');
        L.push('</li>');
    }
    return L.join('');
}

function ajaxLoadComments(insertIntoId, ref_id, page_index) {
    var errorHtml = 'Error when loading. <a href="#0" onclick="ajaxLoadComments(\'' + insertIntoId + '\', \'' + ref_id + '\', ' + page_index + ')">Retry</a>';
    $insertInto = $('#' + insertIntoId);
    $insertInto.html('<i class="uk-icon-spinner uk-icon-spin"></i> Loading...');
    $.getJSON('/api/ref/' + ref_id + '/topics?page=' + page_index).done(function(data) {
        if (data.error) {
            $insertInto.html(errorHtml);
            return;
        }
        // build comment list:
        $insertInto.html(buildComments(data));
        $insertInto.find('.x-auto-content').each(function () {
            makeCollapsable(this, 400);
        });
    }).fail(function() {
        $insertInto.html(errorHtml);
    });
}

var tmp_collapse = 1;

function makeCollapsable(obj, max_height) {
    var $o = $(obj);
    if ($o.height() <= (max_height + 60)) {
        $o.show();
        return;
    }
    console.log('detect height: ' + $o.height());
    var maxHeight = max_height + 'px';
    $o.css('max-height', maxHeight);
    $o.css('overflow', 'hidden');
    $o.after('<p style="padding-left: 75px">' +
        '<a href="#0"><i class="uk-icon-chevron-down"></i> Read More</a>' +
        '<a href="#0" style="display:none"><i class="uk-icon-chevron-up"></i> Collapse</a>' +
        '</p>');
    var aName = 'COLLAPSE-' + tmp_collapse;
    tmp_collapse ++;
    $o.parent().before('<div class="x-anchor"><a name="' + aName + '"></a></div>')
    console.log($o.next().html());
    var $p = $o.next();
    var $aDown = $p.find('a:first');
    var $aUp = $p.find('a:last');
    $aDown.click(function () {
        $o.css('max-height', 'none');
        $aDown.hide();
        $aUp.show();
    });
    $aUp.click(function () {
        $o.css('max-height', maxHeight);
        $aUp.hide();
        $aDown.show();
        location.assign('#' + aName);
    });
    $o.show();
}

function loadComments(ref_id) {
    $(function () {
        var
            isCommentsLoaded = false,
            $window = $(window),
            targetOffset = $('#x-comment-list').get(0).offsetTop,
            checkOffset = function () {
                if (!isCommentsLoaded && (window.pageYOffset + window.innerHeight >= targetOffset)) {
                    isCommentsLoaded = true;
                    $window.off('scroll', checkOffset);
                    console.log('loading comments...');
                    ajaxLoadComments('x-comment-list', ref_id, 1);
                }
            };
        console.log('will load comments at offset: ' + targetOffset);
        $window.scroll(checkOffset);
        checkOffset();
    });

}

$(function() {
    $('.x-auto-content').each(function () {
        makeCollapsable(this, 300);
    });
});


if (! window.console) {
    window.console = {
        log: function(s) {
        }
    };
}

if (! String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

if (! Number.prototype.toDateTime) {
    var replaces = {
        'yyyy': function(dt) {
            return dt.getFullYear().toString();
        },
        'yy': function(dt) {
            return (dt.getFullYear() % 100).toString();
        },
        'MM': function(dt) {
            var m = dt.getMonth() + 1;
            return m < 10 ? '0' + m : m.toString();
        },
        'M': function(dt) {
            var m = dt.getMonth() + 1;
            return m.toString();
        },
        'dd': function(dt) {
            var d = dt.getDate();
            return d < 10 ? '0' + d : d.toString();
        },
        'd': function(dt) {
            var d = dt.getDate();
            return d.toString();
        },
        'hh': function(dt) {
            var h = dt.getHours();
            return h < 10 ? '0' + h : h.toString();
        },
        'h': function(dt) {
            var h = dt.getHours();
            return h.toString();
        },
        'mm': function(dt) {
            var m = dt.getMinutes();
            return m < 10 ? '0' + m : m.toString();
        },
        'm': function(dt) {
            var m = dt.getMinutes();
            return m.toString();
        },
        'ss': function(dt) {
            var s = dt.getSeconds();
            return s < 10 ? '0' + s : s.toString();
        },
        's': function(dt) {
            var s = dt.getSeconds();
            return s.toString();
        },
        'a': function(dt) {
            var h = dt.getHours();
            return h < 12 ? 'AM' : 'PM';
        }
    };
    var token = /([a-zA-Z]+)/;
    Number.prototype.toDateTime = function(format) {
        var fmt = format || 'yyyy-MM-dd hh:mm:ss'
        var dt = new Date(this);
        var arr = fmt.split(token);
        for (var i=0; i<arr.length; i++) {
            var s = arr[i];
            if (s && s in replaces) {
                arr[i] = replaces[s](dt);
            }
        }
        return arr.join('');
    };
    Number.prototype.toSmartDate = function () {
        return toSmartDate(this);
    };
}

function encodeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function toSmartDate(timestamp) {
    if (typeof(timestamp)==='string') {
        timestamp = parseInt(timestamp);
    }
    if (isNaN(timestamp)) {
        return '';
    }
    var
        today = new Date(g_time),
        now = today.getTime(),
        s = '1分钟前',
        t = now - timestamp;
    if (t > 604800000) {
        // 1 week ago:
        var that = new Date(timestamp);
        var
            y = that.getFullYear(),
            m = that.getMonth() + 1,
            d = that.getDate(),
            hh = that.getHours(),
            mm = that.getMinutes();
        s = y===today.getFullYear() ? '' : y + '-';
        s = s + m + '-' + d + ' ' + hh + ':' + (mm < 10 ? '0' : '') + mm;
    }
    else if (t >= 86400000) {
        // 1-6 days ago:
        s = Math.floor(t / 86400000) + '天前';
    }
    else if (t >= 3600000) {
        // 1-23 hours ago:
        s = Math.floor(t / 3600000) + '小时前';
    }
    else if (t >= 60000) {
        s = Math.floor(t / 60000) + '分钟前';
    }
    return s;
}

$(function() {
    // activate nav:
    var xnav = $('meta[property="x-nav"]').attr('content');
    xnav && xnav.trim() && $('#ul-navbar li a[href="' + xnav.trim() + '"]').parent().addClass('uk-active');

    // init scroll:
    var $window = $(window);
    var $body = $('body');
    var $gotoTop = $('div.x-goto-top');
    $window.scroll(function() {
        var t = $window.scrollTop();
        if (t > 1600) {
            $gotoTop.show();
        }
        else {
            $gotoTop.hide();
        }
    });

    // go-top:
    $gotoTop.click(function() {
        $('html, body').animate({scrollTop: 0}, 1000);
    });

    // smart date:
    $('.x-smartdate').each(function() {
        var f = parseInt($(this).attr('date'));
        $(this).text(toSmartDate(f));
    });

    // search query:
    // var input_search = $('input.search-query');
    // var old_width = input_search.css('width');
    // input_search.bind('focusin', function() {
    //     input_search.animate({'width': '160px'}, 500);
    // }).bind('focusout', function() {
    //     input_search.animate({'width': old_width}, 500);
    // });

    hljs.initHighlighting();
    // END
});
