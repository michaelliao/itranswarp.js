// used in management console:

function createAjaxUploadUtils(vm) {
    var vm = vm;
    var initial_content = vm.content;

    var helper = {
        isChanged: function() {
            return vm.content !== initial_content;
        },

        checkImageBeforeUpload: function($file, $preview) {
            // check cover image:
            var
                MIN_WIDTH = 640,
                MIN_HEIGHT = 360;
            $file.removeAttr('name');
            if (vm.id==='' && ($file.val()==='' || $preview.data('width')===0)) {
                showError('Must upload a cover image.', 'cover');
                return false;
            }
            if ($preview.data('width') < MIN_WIDTH || $preview.data('height') < MIN_HEIGHT) {
                showError('Cover is too small (Must be equal or greater than ' + MIN_WIDTH + ' x ' + MIN_HEIGHT + ').', 'cover');
                return false;
            }
            if ($file.val()!=='') {
                $file.attr('name', 'file');
            }
            return true;
        },

        onFileChange: function($file, $preview) {
            return function() {
                showError();
                $preview.css('background-image', '');
                $preview.data('width', 0).data('height', 0);
                var f = $file.val();
                if (f!=='') {
                    try {
                        var lf = $file.get(0).files[0];
                        var ft = lf.type;
                        if (ft=='image/png' || ft=='image/jpeg' || ft=='image/gif') {
                            // check image size:
                            var img = new Image()
                            img.onload = function() {
                                $preview.data('width', this.width).data('height', this.height);
                            }
                            img.src = getObjectURL(lf);
                            $preview.css('background-image', 'url(' + getObjectURL(lf) + ')');
                        }
                        else {
                            showError('Invalid image.');
                            $('.field-cover').addClass('error');
                        }
                    }
                    catch(e) {}
                }
            };
        },

        ajaxPostMultipart: function($editor, $form, action, redirect) {
            if (this.isChanged()) {
                // update content only if it is changed:
                $editor.attr('name', 'content');
            }
            else {
                $editor.removeAttr('name');
            }
            var form = $form.get(0);
            showLoading(true);
            var data = null;
            try {
                data = form.getFormData();
            }
            catch(e) {
                data = new FormData(form);
            }
            $.ajax({
                url: action,
                data: data,
                contentType: false,
                processData: false,
                type: 'POST'
            }).done(function(data) {
                if (data && data.error) {
                    showError(data.message || data.error, data.data);
                    showLoading(false);
                }
                else {
                    window.onbeforeunload = null;
                    location.assign(redirect);
                }
            }).fail(function(jqXHR, textStatus) {
                showError('Network error (HTTP ' + jqXHR.status + ')');
                showLoading(false);
            });
        }
    };
    window.onbeforeunload = function() {
        if (helper.isChanged()) {
            return 'Content has been changed.';
        }
    };
    return helper;
}

function showSuccess(text) {
    var s = $('.alert-success');
    text && s.text(text);
    s.show().delay(3000).slideUp(300);
    if ($('.alert-success').offset().top < $(window).scrollTop()) {
        $('html,body').animate({scrollTop: $('.alert-success').offset().top});
    }
}

function getObjectURL(file) {
    var url = '';
    if (window.createObjectURL!=undefined) // basic
        url = window.createObjectURL(file);
    else if (window.URL!=undefined) // mozilla(firefox)
        url = window.URL.createObjectURL(file);
    else if (window.webkitURL!=undefined) // webkit or chrome
        url = window.webkitURL.createObjectURL(file);
    return url;
}

$(function() {
    $('a[data-toggle=tooltip]').tooltip();
    $('#top-nav li').each(function(e) {
        if (location.pathname.indexOf($(this).find('a').attr('href'))==0) {
            $(this).addClass('active');
        }
    });
});
