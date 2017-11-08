// itranswarp.js

function add_sponsor(selector, width, height, name, img_src, link) {
    var
        stl = 'width:' + width + 'px;height:' + height + 'px;',
        s = '<div style="float:left;margin:0 1px 1px 0;' + stl + '">';
    if (arguments.length === 4) {
        s = s + name;
    } else {
        s = s + '<a target="_blank" href="' + link + '">';
        s = s + '<img src="' + img_src + '">';
        s = s + '</a>';
    }
    s = s + '</div>';
    $(selector).append(s);
}

function deleteTopic(id) {
    if (confirm('Delete this topic?')) {
        postJSON('/api/topics/' + id + '/delete', function (err, result) {
            if (err) {
                alert(err.message || err);
            } else {
                location.assign('/discuss');
            }
        });
    }
}

function deleteReply(id) {
    if (confirm('Delete this reply?')) {
        postJSON('/api/replies/' + id + '/delete', function (err, result) {
            if (err) {
                alert(err.message || err);
            } else {
                refresh();
            }
        });
    }
}

function getCookie(key) {
    var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
    return keyValue ? keyValue[2] : null;
}

function setCookie(key, value, maxAgeInSec) {
    var d = new Date(new Date().getTime() + maxAgeInSec * 1000);
    document.cookie = key + '=' + value + ';path=/;expires=' + d.toGMTString() + (location.protocol === 'https' ? ';secure' : '');
}

function deleteCookie(key) {
    var d = new Date(0);
    document.cookie = key + '=deleted;path=/;expires=' + d.toGMTString() + (location.protocol === 'https' ? ';secure' : '');
}

function message(title, msg, isHtml, autoClose) {
    if ($('#modal-message').length==0) {
        $('body').append('<div id="modal-message" class="uk-modal"><div class="uk-modal-dialog">' +
            '<button type="button" class="uk-modal-close uk-close"></button>' +
            '<div class="uk-modal-header"></div>' +
            '<p class="x-message">msg</p>' +
            '</div></div>');
    }
    var $m = $('#modal-message');
    $m.find('div.uk-modal-header').text(title || 'Message');
    if (isHtml) {
        $m.find('p.x-message').html(msg || '');
    }
    else {
        $m.find('p.x-message').text(msg || '');
    }
    var modal = UIkit.modal('#modal-message');
    modal.show();
}

function _get_code(tid) {
    var
        $pre = $('#pre-' + tid),
        $post = $('#post-' + tid),
        $textarea = $('#textarea-' + tid);
    return $pre.text() + $textarea.val() + '\n' + ($post.length === 0 ? '' : $post.text());
}

function run_javascript(tid, btn) {
    var code = _get_code(tid);
    (function () {
        try {
            eval('(function() {\n' + code + '\n})();');
        }
        catch (e) {
            message('错误', '<p>JavaScript代码执行出错：</p><pre>' + String(e) + '</pre>', true, true);
        }
    })();
}

function run_html(tid, btn) {
    var code = _get_code(tid);
    (function () {
        var w = window.open('about:blank', 'Online Practice', 'width=640,height=480,resizeable=1,scrollbars=1');
        w.document.write(code);
        w.document.close();
    })();
}

function run_sql(tid, btn) {
    if (typeof alasql === undefined) {
        message('错误', '<p>JavaScript嵌入式SQL引擎尚未加载完成，请稍后再试或者刷新页面！</p>', true, true);
        return;
    }
    var code = _get_code(tid);
    var genTable = function (arr) {
        if (arr.length === 0) {
            return 'Empty result set';
        }
        var ths = _.keys(arr[0]);
        var trs = _.map(arr, function (obj) {
            return _.map(ths, function (key) {
                return obj[key];
            });
        });
        return '<table class="uk-table"><thead><tr>'
            + $.map(ths, function (th) {
                return '<th>' + encodeHtml(th) + '</th>';
            }).join('') + '</tr></thead><tbody>'
            + $.map(trs, function (tr) {
                return '<tr>' + $.map(tr, function (td) {
                    return '<td>' + encodeHtml(td) + '</td>';
                }).join('') + '</tr>';
            }).join('') + '</tbody></table>';
    };
    var showSqlResult = function (result) {
        var $r = $(btn).next('div.x-sql-result');
        if ($r.get(0) === undefined) {
            $(btn).after('<div class="x-sql-result x-code uk-alert"></div>');
            $r = $(btn).next('div.x-sql-result');
        }
        $r.removeClass('uk-alert-danger');
        if (Array.isArray(result)) {
            $r.html(genTable(result));
        } else if (result && result.error) {
            $r.addClass('uk-alert-danger');
            $r.html($.map(result.message.split('\n'), function (s) {
                return '<p>' + encodeHtml(s) + '</p>';
            }).join(''));
        } else {
            $r.text(result);
        }
    };
    (function () {
        var
            i, result, s = '',
            lines = code.split('\n');
        lines = _.map(lines, function (line) {
            var n = line.indexOf('--');
            if (n >= 0) {
                line = line.substring(0, n);
            }
            return line;
        });
        lines = _.filter(lines, function (line) {
            return line.trim() !== '';
        });
        // join:
        for (i=0; i<lines.length; i++) {
            s = s + lines[i] + '\n';
        }
        // split by ;
        lines = _.filter(s.trim().split(';'), function (line) {
            return line.trim() !== '';
        });
        // run each sql:
        result = null;
        for (i=0; i<lines.length; i++) {
            s = lines[i];
            try {
                result = alasql(s);
            } catch (e) {
                result = {
                    error: true,
                    message: 'ERROR when execute SQL: ' + s + '\n' + String(e)
                }
                break;
            }
        }
        showSqlResult(result);
    })();
}

function run_python3(tid, btn) {
    var
        $pre = $('#pre-' + tid),
        $post = $('#post-' + tid),
        $textarea = $('#textarea-' + tid),
        $button = $(btn),
        $i = $button.find('i'),
        code = $pre.text() + $textarea.val() + '\n' + ($post.length === 0 ? '' : $post.text());
    $button.attr('disabled', 'disabled');
    $i.addClass('uk-icon-spinner');
    $i.addClass('uk-icon-spin');
    $.post('http://local.liaoxuefeng.com:39093/run', $.param({
        code: code
    })).done(function (r) {
        var output = '<pre style="word-break: break-all; word-wrap: break-word; white-space: pre-wrap;"><code>' + (r.output || '(空)').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></code>';
        message(r.error || 'Result', output, true);
    }).fail(function (r) {
        message('错误', '无法连接到Python代码运行助手。请检查<a target="_blank" href="/wiki/0014316089557264a6b348958f449949df42a6d3a2e542c000/001432523496782e0946b0f454549c0888d05959b99860f000">本机的设置</a>。', true, true);
    }).always(function () {
        $i.removeClass('uk-icon-spinner');
        $i.removeClass('uk-icon-spin');
        $button.removeAttr('disabled');
    });
}

function adjustTextareaHeight(t) {
    var
        $t = $(t),
        lines = $t.val().split('\n').length;
    if (lines < 9) {
        lines = 9;
    }
    $t.attr('rows', '' + (lines + 1));
}

$(function() {
    var tid = 0;
    var trimCode = function (code) {
        var ch;
        while (code.length > 0) {
            ch = code[0];
            if (ch === '\n' || ch === '\r') {
                code = code.substring(1);
            }
            else {
                break;
            }
        }
        while (code.length > 0) {
            ch = code[code.length-1];
            if (ch === '\n' || ch === '\r') {
                code = code.substring(0, code.length-1);
            }
            else {
                break;
            }
        }
        return code + '\n';
    };
    var initPre = function (pre, fn_run) {
        tid ++;
        var
            theId = 'online-run-code-' + tid,
            $pre = $(pre),
            $post = null,
            codes = $pre.text().split('----', 3);
        $pre.attr('id', 'pre-' + theId);
        $pre.css('font-size', '14px');
        $pre.css('margin-bottom', '0');
        $pre.css('border-bottom', 'none');
        $pre.css('padding', '6px');
        $pre.css('border-bottom-left-radius', '0');
        $pre.css('border-bottom-right-radius', '0');
        $pre.wrap('<form class="uk-form uk-form-stack" action="#0"></form>');
        $pre.after('<button type="button" onclick="' + fn_run + '(\'' + theId + '\', this)" class="uk-button uk-button-primary" style="margin-top:15px;"><i class="uk-icon-play"></i> Run</button>');
        if (codes.length > 1) {
            $pre.text(trimCode(codes[0]))
            if (codes.length === 3) {
                // add post:
                $pre.after('<pre id="post-' + theId + '" style="font-size: 14px; margin-top: 0; border-top: 0; padding: 6px; border-top-left-radius: 0; border-top-right-radius: 0;"></pre>');
                $post = $('#post-' + theId);
                $post.text(trimCode(codes[2]));
            }
        }
        $pre.after('<textarea id="textarea-' + theId + '" onkeyup="adjustTextareaHeight(this)" class="uk-width-1-1 x-codearea" rows="10" style="overflow: scroll; border-top-left-radius: 0; border-top-right-radius: 0;' + ($post === null ? '' : 'border-bottom-left-radius: 0; border-bottom-right-radius: 0;') + '"></textarea>');
        if (codes.length > 1) {
            $('#textarea-' + theId).val(trimCode(codes[1]));
            adjustTextareaHeight($('#textarea-' + theId).get(0));
        }

    };
    $('pre.x-javascript').each(function () {
        initPre(this, 'run_javascript');
    });
    $('pre.x-html').each(function () {
        initPre(this, 'run_html');
    });
    $('pre.x-sql').each(function () {
        initPre(this, 'run_sql');
    });
    $('pre.x-python3').each(function () {
        initPre(this, 'run_python3');
    });
});

function initCommentArea(ref_type, ref_id, tag) {
    $('#x-comment-area').html($('#tplCommentArea').html());
    var $makeComment = $('#comment-make-button');
    var $commentForm = $('#comment-form');
    var $postComment = $commentForm.find('button[type=submit]');
    var $cancelComment = $commentForm.find('button.x-cancel');
    $makeComment.click(function () {
        $commentForm.showFormError();
        $commentForm.show();
        $commentForm.find('div.x-textarea').html('<textarea></textarea>');
        var htmleditor = UIkit.htmleditor($commentForm.find('textarea').get(0), {
            mode: 'split',
            maxsplitsize: 600,
            markdown: true
        });
        $makeComment.hide();
    });
    $cancelComment.click(function () {
        $commentForm.find('div.x-textarea').html('');
        $commentForm.hide();
        $makeComment.show();
    });
    $commentForm.submit(function (e) {
        e.preventDefault();
        $commentForm.postJSON('/api/comments/' + ref_type + '/' + ref_id, {
            tag: tag,
            name: $commentForm.find('input[name=name]').val(),
            content: $commentForm.find('textarea').val()
        }, function (err, result) {
            if (err) {
                return;
            }
            refresh('#comments');
        });
    });
}

var signinModal = null;

function showSignin(forceModal) {
    if (g_signins.length === 1 && !forceModal) {
        return authFrom(g_signins[0].id);
    }
    if (signinModal === null) {
        signinModal = UIkit.modal('#modal-signin', {
            bgclose: false,
            center: true
        });
    }
    signinModal.show();
}

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
    tplCommentReply = null,
    tplCommentInfo = null;

function buildComments(data) {
    if (tplComment === null) {
        tplComment = new Template($('#tplComment').html());
    }
    if (tplCommentReply === null) {
        tplCommentReply = new Template($('#tplCommentReply').html());
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
                L.push(tplCommentReply.render(reply));
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
                    ajaxLoadComments('x-comment-list', ref_id, 1);
                }
            };
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

// parse query string as object:

function parseQueryString() {
    var
        q = location.search,
        r = {},
        i, pos, s, qs;
    if (q && q.charAt(0)==='?') {
        qs = q.substring(1).split('&');
        for (i=0; i<qs.length; i++) {
            s = qs[i];
            pos = s.indexOf('=');
            if (pos <= 0) {
                continue;
            }
            r[s.substring(0, pos)] = decodeURIComponent(s.substring(pos+1)).replace(/\+/g, ' ');
        }
    }
    return r;
}

function gotoPage(i) {
    var r = parseQueryString();
    r.page = i;
    location.assign('?' + $.param(r));
}

function refresh(anchor) {
    var r = parseQueryString();
    r.t = new Date().getTime();
    location.assign('?' + $.param(r) + (anchor ? anchor : ''));
}

// extends jQuery.form:

$(function () {
    $.fn.extend({
        showFormError: function (err) {
            return this.each(function () {
                var
                    $form = $(this),
                    $alert = $form && $form.find('.uk-alert-danger'),
                    fieldName = err && err.data;
                if (! $form.is('form')) {
                    console.error('Cannot call showFormError() on non-form object.');
                    return;
                }
                $form.find('input').removeClass('uk-form-danger');
                $form.find('select').removeClass('uk-form-danger');
                $form.find('textarea').removeClass('uk-form-danger');
                if ($alert.length === 0) {
                    console.warn('Cannot find .uk-alert-danger element.');
                    return;
                }
                if (err) {
                    $alert.text(err.message ? err.message : (err.error ? err.error : err)).removeClass('uk-hidden').show();
                    if (($alert.offset().top - 60) < $(window).scrollTop()) {
                        $('html,body').animate({ scrollTop: $alert.offset().top - 60 });
                    }
                    if (fieldName) {
                        $form.find('[name=' + fieldName + ']').addClass('uk-form-danger');
                    }
                }
                else {
                    $alert.addClass('uk-hidden').hide();
                    $form.find('.uk-form-danger').removeClass('uk-form-danger');
                }
            });
        },
        showFormLoading: function (isLoading) {
            return this.each(function () {
                var
                    $form = $(this),
                    $submit = $form && $form.find('button[type=submit]'),
                    $buttons = $form && $form.find('button');
                    $i = $submit && $submit.find('i'),
                    iconClass = $i && $i.attr('class');
                if (! $form.is('form')) {
                    console.error('Cannot call showFormLoading() on non-form object.');
                    return;
                }
                if (!iconClass || iconClass.indexOf('uk-icon') < 0) {
                    console.warn('Icon <i class="uk-icon-*>" not found.');
                    return;
                }
                if (isLoading) {
                    $buttons.attr('disabled', 'disabled');
                    $i && $i.addClass('uk-icon-spinner').addClass('uk-icon-spin');
                }
                else {
                    $buttons.removeAttr('disabled');
                    $i && $i.removeClass('uk-icon-spinner').removeClass('uk-icon-spin');
                }
            });
        },
        postJSON: function (url, data, callback) {
            if (arguments.length===2) {
                callback = data;
                data = {};
            }
            return this.each(function () {
                var $form = $(this);
                $form.showFormError();
                $form.showFormLoading(true);
                _httpJSON('POST', url, data, function (err, r) {
                    if (err) {
                        $form.showFormError(err);
                        $form.showFormLoading(false);
                    }
                    if (callback) {
                        if (callback(err, r)) {
                            $form.showFormLoading(false);
                        }
                    }
                });
            });
        }
    });
});

// ajax submit form:

function _httpJSON(method, url, data, callback) {
    var opt = {
        type: method,
        dataType: 'json'
    };
    if (method==='GET') {
        opt.url = url + '?' + data;
    }
    if (method==='POST') {
        opt.url = url;
        opt.data = JSON.stringify(data || {});
        opt.contentType = 'application/json';
    }
    $.ajax(opt).done(function (r) {
        if (r && r.error) {
            return callback(r);
        }
        return callback(null, r);
    }).fail(function (jqXHR, textStatus) {
        return callback({'error': 'http_bad_response', 'data': '' + jqXHR.status, 'message': '网络好像出问题了 (HTTP ' + jqXHR.status + ')'});
    });
}

function getJSON(url, data, callback) {
    if (arguments.length===2) {
        callback = data;
        data = {};
    }
    if (typeof (data)==='object') {
        var arr = [];
        $.each(data, function (k, v) {
            arr.push(k + '=' + encodeURIComponent(v));
        });
        data = arr.join('&');
    }
    _httpJSON('GET', url, data, callback);
}

function postJSON(url, data, callback) {
    if (arguments.length===2) {
        callback = data;
        data = {};
    }
    _httpJSON('POST', url, data, callback);
}

$(function() {
    // activate navigation menu:
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

// signin with oauth:

var isDesktop = (function() {
    var ua = navigator.userAgent.toLowerCase();
    return ua.indexOf('windows nt')>=0 || ua.indexOf('macintosh')>=0;
})();

function onAuthCallback(err, user) {
    if (signinModal !== null) {
        signinModal.hide();
    }
    if (err) {
        // handle error...
        return;
    }
    g_user = {
        id: user.id,
        name: user.name,
        image_url: user.image_url
    };
    // update user info:
    $('.x-user-name').text(g_user.name);
    // update css:
    $('#x-doc-style').text('.x-display-if-signin {}\n.x-display-if-not-signin { display: none; }\n');
    // reload if neccessary:
    if (typeof(g_reload_after_signin) !== 'undefined' && g_reload_after_signin === true) {
        location.reload();
    }
    else {
        if (typeof(onAuthSuccess) === 'function') {
            onAuthSuccess();
        }
    }
}

function authFrom(provider) {
    var
        url = '/auth/from/' + provider,
        popupId = location.hostname.replace(/\./g, '_');
    if (isDesktop) {
        var w = window.open(url + '?jscallback=onAuthCallback', popupId, 'top=200,left=400,width=600,height=380,directories=no,menubar=no,toolbar=no,resizable=no');
    }
    else {
        location.assign(url);
    }
}
