// itranswarp.js

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
}

if (! Number.prototype.toFileSize) {
    Number.prototype.toFileSize = function() {
        var size = this;
        if (size < 1024)
            return size + ' bytes';
        size = size / 1024.0;
        if (size < 1024)
            return size.toFixed(2) + ' KB';
        size = size / 1024.0;
        if (size < 1024)
            return size.toFixed(2) + ' MB';
        size = size / 1024.0;
        return size.toFixed(2) + ' GB';
    };
}

// global functions:

var parseDateTime = (function() {
    var replaces = {
        'yyyy': {
            re: '(19[0-9][0-9]|20[0-9][0-9])',
            fn: function(dt, value) {
                dt.setFullYear(value);
            }
        },
        'MM': {
            re: '(0[1-9]|1[0-2]|[0-9])',
            fn: function(dt, value) {
                dt.setMonth(value - 1);
            }
        },
        'dd': {
            re: '(0[1-9]|1[0-9]|2[0-9]|3[0-1]|[0-9])',
            fn: function(dt, value) {
                dt.setDate(value);
            }
        },
        'hh': {
            re: '(0[0-9]|1[0-9]|2[0-3]|[0-9])',
            fn: function(dt, value) {
                dt.setHours(value);
            }
        },
        'mm': {
            re: '(0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|[0-9])',
            fn: function(dt, value) {
                dt.setMinutes(value);
            }
        },
        'ss': {
            re: '(0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|[0-9])',
            fn: function(dt, value) {
                dt.setSeconds(value);
            }
        }
    };
    var token = /([a-zA-Z]+)/;
    var normalChars = /[a-zA-Z0-9]/;
    var filter = function(arr, fn) {
        var r = [];
        for (var i = 0; i < arr.length; i ++) {
            var x = arr[i];
            if (fn(x)) {
                r.push(x);
            }
        }
        return r;
    };
    return function(s, format) {
        if (! s) {
            return NaN;
        }
        var fmt = format || 'yyyy-MM-dd hh:mm:ss';
        var arr = filter(fmt.split(token), function(s) { return s!==''; });
        var pp = '^';
        for (var i = 0; i < arr.length; i ++) {
            var p = arr[i];
            if (p in replaces) {
                pp = pp + replaces[p].re;
            }
            else {
                for (var n = 0; n < p.length; n ++ ) {
                    var ch = p.charAt(n);
                    pp = pp + '(' + (normalChars.test(ch) ? '' : '\\') + ch + ')';
                }
            }
        }
        pp = pp + '$';
        var m = new RegExp(pp).exec(s);
        if (m) {
            m.shift();
            var dt = new Date(0);
            for (var i = 0; i < arr.length; i ++) {
                var p = arr[i];
                if (p in replaces) {
                    replaces[p].fn(dt, parseInt(m[i]));
                }
            }
            return dt.getTime();
        }
        return NaN;
    };
})();

function gotoPage(index) {
    if (index) {
        var search = location.search;
        var hasPageParam = search.search(/page\=\d+\&?/)!==(-1);
        if (hasPageParam) {
            search = search.replace(/page\=\d+\&?/g, '');
        }
        search = (search==='' || search==='?') ? ('?page=' + index) : (search + '&page=' + index);
        location.assign(search);
    }
}

function refresh() {
    var
        p = location.pathname,
        s = location.search,
        t = new Date().getTime();
    var url;
    if (s) {
        url = p + s + '&t=' + t;
    }
    else {
        url = p + '?t=' + t;
    }
    location.assign(url);
}

function showLoading(show) {
    if (show) {
        $('button[type=submit]').attr('disabled', 'disabled');
        $('button[type=submit] > i').addClass('x-loading');
    }
    else {
        $('button[type=submit]').removeAttr('disabled');
        $('button[type=submit] > i').removeClass('x-loading');
    }
}

function showError(err, fieldName) {
    // clear all errors:
    $('div.control-group').removeClass('error');
    // set error:
    if (err) {
        if (fieldName) {
            $('.field-' + fieldName).addClass('error');
        }
        $('.alert-error').text(err.message || err.error || err).show();
        try {
            if ($('.alert-error').offset().top < ($(window).scrollTop() - 41)) {
                $('html,body').animate({scrollTop: $('.alert-error').offset().top - 41});
            }
        }
        catch (e) {}
    }
    else {
        // clear error:
        $('.alert-error').text('').hide();
    }
}

function _httpJSON(method, url, data, callback) {
    if (arguments.length==3) {
        callback = data;
        data = {};
    }
    $.ajax({
        type: method,
        url: url,
        data: data,
        dataType: 'json'
    }).done(function(r) {
        if (r && r.error) {
            return callback(r);
        }
        return callback(null, r);
    }).fail(function(jqXHR, textStatus) {
        callback({'error': 'HTTP ' + jqXHR.status, 'message': ' Network error (HTTP ' + jqXHR.status + ')'});
    });
}

function getJSON(url, data, callback) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift('GET');
    _httpJSON.apply(null, args)
    return false;
}

function postJSON(url, data, callback) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift('POST');
    _httpJSON.apply(null, args)
    return false;
}

function showConfirm(title, text_or_html, callback) {
    var s = '<div class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button>'
          + '<h3>' + $('<div/>').text(title).html() + '</h3></div>'
          + '<div class="modal-body">'
          + ((text_or_html.length > 0 && text_or_html[0]==='<') ? text_or_html : '<p>' + $('<div/>').text(text_or_html).html() + '</p>')
          + '</div><div class="modal-footer"><a href="#" class="btn btn-primary"><i class="icon-ok icon-white"></i> OK</a><a href="#" class="btn" data-dismiss="modal"><i class="icon-remove"></i> Cancel</a></div></div>';
    $('body').prepend(s);
    var $modal = $('body').children(':first');
    $modal.modal('show');
    $modal.find('.btn-primary').click(function() {
        $modal.attr('result', 'ok');
        $btn = $(this);
        callback({
            showLoading: function() {
                $btn.attr('disabled', 'disabled');
                $btn.find('i').addClass('x-loading');
            },
            hide: function() {
                $modal.modal('hide');
            }
        });
    });
    $modal.on('hidden', function() {
        $modal.remove();
    });
}
