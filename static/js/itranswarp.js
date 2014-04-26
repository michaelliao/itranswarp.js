// itranswarp.js

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
        fieldName = fieldName || err.data;
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

setTimeout(function() {
    var s = "\n" +
"This cool website is powered by:\n" +
"  _ _____                                                     _      \n" +
" (_)_   _| __ __ _ _ __  _____      ____ _ _ __ _ __         (_)___  \n" +
" | | | || '__/ _` | '_ \\/ __\\ \\ /\\ / / _` | '__| '_ \\        | / __| \n" +
" | | | || | | (_| | | | \\__ \\\\ V  V / (_| | |  | |_) |  _    | \\__ \\ \n" +
" |_| |_||_|  \\__,_|_| |_|___/ \\_/\\_/ \\__,_|_|  | .__/  (_)  _/ |___/ \n" +
"                                               |_|         |__/      \n" +
"\n" +
"Want to get source code? type source()\n" +
"Want to get author info? type author()\n" +
"\n";
    console.log(s);
    window.source = function() {
        console.log('Searching source code...');
        setTimeout(function() {
            console.log('Using Google search...');
            setTimeout(function() {
                console.log('Using Bing search...');
                setTimeout(function() {
                    console.log('Ask Siri...');
                    setTimeout(function() {
                        console.log('Found!\n\nSource code can be folked from https://github.com/michaelliao/itranswarp.js\n\nCheers!\n');
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 1000);
    };
    window.author = function() {
        console.log('\nAuthor: Michael Liao\nOfficial Website: http://www.liaoxuefeng.com\n                           .... ... ... ... ...\n                        .:+I$OOOOOOOOOOOOO8OZ7I,..\n                      ,=8OOOZZZO8ZZZZOZ8OOOOOO88OOOOZ,..\n                   .~88OZO88OZZO88OOOOOO88OOOOOO8OOOZO88.\n                .,88O88OOD88OZ8Z .ZOOOOOO888OOOOO888OOOOO88:.\n              ..+8OO8DOO888OZ8Z.....DOOOOO888OZOO8888OOOO8OO8.\n              ~8OOO88888D8ZO8. .......78OZZZO88888888888OOOO8D8,\n            .IZZOO8DOO88OO8$.............=$8OOO888888888888O8888.\n            8ZZZO8D8ODDOD?...................~I888D8DD8888DD88888:\n           :OZOODD8ODD87 . ....................... ,7$O8D888888888,\n          ,8$ZOO8O8D$............................   ......,O888888D,\n          88OO8D8= ......... . . .,+O?==D888888OOZZZ8OZOOZ$777O888ZZIIIIII$O.\n         .D88D8~..........,+77OD888OOZZZ777$$Z$7ZZ$$OOO88888Z?$888D8ZI$O8II$,\n         ,DO$DO,,=888D8O$7Z$$7$ZO8D8OZZ77$8O......... ... ... ..8OOZ? :87?O:\n ...::::,8D8D88888Z7$ZOO888$?:... ..O8$$ZZ$8  ... ...: .. ... ...~8Z?.8$IO,\n  88IZDDO88888ZI=..................,O$8DI8Z$D......:DDD8. ... ... ..887I~\n   87ZD8:.... ........DDDZ.. . . .=8$D8, .D$$D . . =8DD8.       ..7DZIIZ.\n   .O$O8..    .........8DD+..... 8O787....,87I78+~,,.ZOZOZOOO88Z7I??IZO.\n    8OZO+.    ..........,. ....?8$7O+. 88$..88Z777$ZZ$Z$IIIIIIIIII77O,\n    .D8$ZZ... .........=O88D8ZO$7ZD: .=D$O.... ~ODD8888$I?.:.... ..,,\n     .DO7$O7I+?7+=+7DD8O$77$$7$8$, ....DO8............... ... ...  7.\n       :O77777777II77$$Z88DI:.. . ... ..+ ... ... ... ... ... ... ?8\n        .8ZZ$$$ZO8D88$=:. ... ... ... ... ... ... ... ... ... ...,D:\n           .8,.  ........................................ ... ..?O.\n           .O~.............. . . . . . . 7:  . . . . . ..     .,Z\n            .O8,.......................oDZO8o............ ... OZ.\n             .+8:............ ... ... ..8O88. ... ... ... ..ZO.\n                ~8=.......... ... ... .. ,  . ... ... ....=D:\n                  ?8?, ................................~O8?\n                    .OD8I=..                     . .888O.\n                       ..ZZZ888?: ... ... ... .:88O:\n                            .,O888DDD8888DDD888:\n                                       ,$IIO,\n                                      ,OIIOO..\n                                     ~88O8OZ88O8D..\n                                  .,8888O8DD88O8DD8:.\n                                 ODD888888DD88D888DDDD,\n                                88DD888DDDDDDDDDDDDD8OD,.\n                               :DDDZ8DDDDDNDNDNDDDDDDOZ88,\n                              .8ODDDDDDDDDDDDDD88888Z8O$DD:\n                             .OO8DOO88OO8888D88888OOZZD$$OD8.\n                            .O878OZOO8888888D888O8OOOO88??OD,.\n                           .O8778ZO88O888O88OOOZOOOOOOOD$+?88..\n                          ..8ZI78ZZOOOOOOOOOOOZZOOO88888O?+OD8..\n');
    };
}, 2000);
