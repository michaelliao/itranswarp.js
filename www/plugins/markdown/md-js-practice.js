'use strict';

/**
 * Plugin for js code practice.
 * 
 * Markdown syntax:
 * 
 * ``` js-practice
 * 'use strict';
 * ----
 * var name = 'Hello';
 * ----
 * alert(name);
 * ```
 * 
 * HTML output:
 * 
 * <form ...>
 *   <pre>
 *     fixed code
 *   </pre>
 *   <textarea>
 *     editable code
 *   </textarea>
 *   <pre>
 *     fixed code
 *   </pre>
 *   <button>Run</button>
 * </form>
 */

const uuid = require('uuid/v4');

const
    TEXT_AREA_STYLE_1 = ' border-top-left-radius: 0; border-top-right-radius: 0;',
    TEXT_AREA_STYLE_2 = ' border-bottom-left-radius: 0; border-bottom-right-radius: 0;';

const JS = `<script>
if (!window.execJsPractice) {
    window.execJsPractice = function (formId) {
        var
            $form = $('#' + formId),
            pre = $form.find('pre.js-practice-prefix').text(),
            editable = $form.find('textarea').val(),
            post = $form.find('pre.js-practice-postfix').text(),
            code = pre + '\\n' + editable + '\\n' + post;
        (function () {
            try {
                eval('(function() {\\nvar alert=function(s){UIkit.modal.alert(s.replace(/\\</g, '&lt;'));}\\n' + code + '\\n})();');
            }
            catch (e) {
                UIkit.modal.alert('<h1>Error</h1><p>JavaScript code error:</p><pre>' + String(e).replace(/\\</g, '&lt;') + '</pre>');
            }
        })();
    };
}
</script>`;

function encodePre(code) {
    return code.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
}

function generateForm(prefixCode, editableCode, postfixCode) {
    let
        id = 'f-' + uuid(),
        s = JS;
    s += `<form id="${id}" class="uk-form uk-form-stack" action="#0">`;
    if (prefixCode) {
        s += `<pre class="js-practice-prefix" style="font-size: 14px; margin-bottom: 0; border-bottom: none; padding: 6px; border-bottom-left-radius: 0; border-bottom-right-radius: 0;">${encodePre(prefixCode)}</pre>`;
    }
    s += `<textarea class="uk-width-1-1" rows="10" style="resize: none; font-size: 14px; font-family: Consolas, monospace, serif; overflow: scroll;${prefixCode ? TEXT_AREA_STYLE_1 : ''}${postfixCode ? TEXT_AREA_STYLE_2 : ''}"></textarea>`;
    if (postfixCode) {
        s += `<pre class="js-practice-postfix" style="font-size: 14px; margin-top: 0; border-top: none; padding: 6px; border-top-left-radius: 0; border-top-right-radius: 0;">${encodePre(postfixCode)}</pre>`;
    }
    s += `<button type="button" onclick="execJsPractice('${id}')" class="uk-button uk-button-primary" style="margin: 5px, 0 15px, 0;"><i class="uk-icon-play"></i> Run</button>`;
    s += '</form>';
    return s;
}

module.exports = {
    type: 'code',
    plugin: 'js-practice',
    render: function (code, lang) {
        let
            pre, editable, post,
            parts = code.split('----');
        if (parts.length === 1) {
            editable = parts[0];
        } else if (parts.length === 2) {
            pre = parts[0];
            editable = parts[1];
        } else {
            pre = parts[0];
            editable = parts[1];
            post = parts[2];
        }
        return generateForm(pre, editable, post);
    }
};
