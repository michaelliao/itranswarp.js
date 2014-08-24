// theme/default js:

var authFrom = (function() {
    var isDesktop = function() {
        var ua = navigator.userAgent.toLowerCase();
        return ua.indexOf('windows nt')>=0 || ua.indexOf('macintosh')>=0;
    };
    return function(provider) {
        var
            url = '/auth/from/' + provider,
            popupId = 'x_id_auth_window';
        if (isDesktop()) {
            var w = window.open(url + '?jscallback=onAuthCallback', popupId, 'top=200,left=400,width=600,height=380,directories=no,menubar=no,toolbar=no,resizable=no');
        }
        else {
            location.assign(url);
        }
    };
})();

var onAuthCallback = function(u) {
    $('.x-user-name').text(u.name);
    $('.x-user-image').attr('src', u.image_url);
    $('.x-auth-signed').show();
    $('.x-auth-not-signed').hide();
}

function makeSmartDate() {
    $('.x-smartdate').each(function() {
        $(this).removeClass('x-smartdate').text(toSmartDate($(this).attr('date')));
    });
}

$(function() {
    // set user image:
    $('img.x-user-image').attr('src', g_user_image);

    // active nav bar:
    var xnav = $('meta[property="x-nav"]').attr('content');
    $('#main-nav-bar li a[href="' + xnav + '"]').parent().addClass('active');

    // init scroll:
    var $window = $(window);
    var $header = $('#header');
    var $navbar = $('#navbar');
    var $autodisplay = $('.x-auto-display');
    $window.scroll(function() {
        if ($window.scrollTop() >= 100) {
            if ( ! $navbar.hasClass('navbar-fixed-top')) {
                $navbar.addClass('navbar-fixed-top');
                $header.css('margin-top', '40px');
                $autodisplay.css('display', '');
            }
        }
        else {
            if ($navbar.hasClass('navbar-fixed-top')) {
                $navbar.removeClass('navbar-fixed-top');
                $header.css('margin-top', '0px');
                $autodisplay.css('display', 'none');
            }
        }

        if ($(window).scrollTop() > 1000) {
            $('div.x-goto-top').show();
        }
        else {
            $('div.x-goto-top').hide();
        }
    });

    // goto-top:
    $('div.x-goto-top').click(function() {
        $('html, body').animate({scrollTop: 0}, 1000);
    });

    // start carousel:
    $('.carousel').carousel();

    // smart date:
    makeSmartDate();

    // add '_blank' for all external links:
    $('.x-content a[href^="http://"]').attr('target', '_blank');
    $('.x-content a[href^="https://"]').attr('target', '_blank');

    // search query:
    var input_search = $('input.search-query');
    var old_width = input_search.css('width');
    input_search.bind('focusin', function() {
        input_search.animate({'width': '160px'}, 500);
    }).bind('focusout', function() {
        input_search.animate({'width': old_width}, 500);
    });

    // smart video:
    var bSupportVideo = !!document.createElement('video').canPlayType;
    if (bSupportVideo) {
        var v = document.createElement('video');
        bSupportVideo = v.canPlayType('video/mp4')!='';
    }
    $('div[data-type=video]').each(function() {
        var d = $(this);
        d.addClass('x-video');
        if (! bSupportVideo) {
            d.html('<div style="padding:20px 10px;">您的浏览器不支持播放该MP4视频</div>');
        }
        else {
            var src = d.attr('data-src');
            var w = d.attr('data-width');
            var h = d.attr('data-height');
            d.addClass('x-video-active');
            d.html('<div class="x-video-button"><div class="x-video-play"></div></div>');
            var s = '<video width="' + w + '" height="' + h + '" controls="controls" preload="auto" autoplay style="border:solid 1px #ccc"><source src="' + src + '" /></video>'
            d.click(function() {
                d.css('display', 'none');
                d.after(s);
            });
        }
    });

    // END
});

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
        s = y===today.getFullYear() ? '' : y + '年';
        s = s + m + '月' + d + '日 ' + hh + ':' + (mm < 10 ? '0' : '') + mm;
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

function search(keyword) {
    location.assign('http://www.baidu.com/s?ie=utf-8&wd=' + encodeURIComponent(keyword) + '+site%3A' + location.hostname);
    return false;
}

function tryPython() {
    var name = 'iTranswarp_try_python_online';
    var opt = 'width=656,height=420,left=400,top=200,toolbar=no,directories=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no';
    var py = window.open('/static/embed/pyconsole.html#0', name, opt);
    py && py.focus();
}

function setFormError($form, name, text) {
    if (arguments.length === 2) {
        text = name;
        name = undefined;
    }
    $form.find('.control-group').removeClass('error');
    var msg = $form.find('.alert-error');
    if (text) {
        msg.text(text).show();
        name && $form.find('.field-' + name).addClass('error');
    }
    else {
        msg.text('').hide();
        name && $form.find('.field-' + name).removeClass('error');
    }
}

function create_topic(form) {
    try {
        var
            $form = $(form),
            $btn = $form.find('button[type=submit]'),
            $name = $form.find('input[name=name]'),
            $tags = $form.find('input[name=tags]'),
            $textarea = $form.find('textarea[name=content]');
        if ($name.val().trim().length === 0) {
            setFormError($form, 'name', '请输入话题！');
            return false;
        }
        if ($textarea.val().trim().length===0) {
            setFormError($form, 'content', '请输入话题内容！');
            return false;
        }

        setFormError($form, '');
        showLoading(true);

        postJSON($form.attr('url'), $form.serialize(), function(err, result) {
            if (err) {
                showLoading(false);
                setFormError($form, err.data, err.message || err.error);
                return;
            }
            location.assign('/discuss/' + result.board_id + '/' + result.id);
        });
    }
    catch (e) {}
    return false;
}

// create comment by ajax:

function setCommentError($form, s) {
    s = s || '';
    $form.find('span.x-comment-error').text(s);
}

var _comment_template = '<!-- comment template -->' +
    '<div class="x-comment-li">' +
    '    <div class="x-comment-img">' +
    '        <a class="x-comment-user"><img class="x-user-image-small" /></a>' +
    '    </div>' +
    '    <div class="x-comment-main">' +
    '        <div class="x-comment-prompt">' +
    '            <span class="x-comment-username"></span> <span class="x-comment-date"></span>：' +
    '        </div>' +
    '        <div class="x-comment-content"></div>' +
    '        <div class="x-comment-prompt">' +
    '            <span>' +
    '                <a href="#0" onclick="replyComment(this)">回复</a>' +
    '                <a href="javascript:deleteComment(\'$ID\')" class="x-delete-comment" style="display:none">Delete</a>' +
    '            </span>' +
    '        </div>' +
    '    </div>' +
    '</div>';

function replyComment(a) {
    var p = $(a);
    while (! p.hasClass('x-comment-li')) {
        if (p.get(0)===document) {
            return;
        }
        p = p.parent();
    }
    var u = '@' + p.find('.x-comment-username').text();
    var $textarea = $('form.x-comment-form').find('textarea[name=content]');
    $textarea.val(u + '\n' + $textarea.val());
    $('html, body').animate({scrollTop: $('form.x-comment-form').position().top - 20});
    $textarea.focus();
    $textarea.get(0).setSelectionRange(u.length + 1, u.length + 1);
}

function comment2html(s) {
    var ss = s.split('\n');
    var L = [];
    $.each(ss, function(index, value) {
        L.push('<p>' + value.replace(/  /g, '&nbsp; ') + '</p>');
    });
    return L.join('');
}

function addComment(c) {
    var $dom = $(_comment_template.replace('$ID', c.id));
    $dom.find('a.x-comment-user').attr('href', '/user/' + c.user_id);
    $dom.find('span.x-comment-username').text(c.user_name);
    $dom.find('span.x-comment-date').text(toSmartDate(c.created_at));
    $dom.find('div.x-comment-img img').attr('src', c.user_image_url);
    $dom.find('div.x-comment-content').html(comment2html(c.content));
    $dom.attr('id', 'comment-' + c.id);
    return $dom;
}

function create_comment(form) {
    try {
        var $form = $(form);
        var $btn = $form.find('button[type=submit]');
        var $textarea = $form.find('textarea[name=content]');
        var s = $textarea.val();
        if (s.trim().length===0) {
            setCommentError($form, '请输入评论内容！');
            return false;
        }

        setCommentError($form, '');
        showLoading(true);

        postJSON($form.attr('url'), $form.serialize(), function(err, result) {
            showLoading(false);
            if (err) {
                setCommentError($form, err.message || err.error);
                return;
            }
            $textarea.val('');
            var $dom = addComment(result);
            $('div.x-comments-list').prepend($dom);
            $dom.css('display', 'none');
            $dom.slideDown();
        });
    }
    catch (e) {}
    return false;
}

function deleteComment(cid) {
    if (confirm('delete this comment?')) {
        postJSON('/api/comments/' + cid + '/delete', function(err, result) {
            if (err) {
                return alert('Error: ' + (err.message || err.error));
            }
            $('#comment-' + cid).remove();
        });
    }
}

// END create comment by ajax.
