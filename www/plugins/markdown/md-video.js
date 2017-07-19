'use strict';

/**
 * Plugin for video.
 * 
 * Markdown syntax:
 * 
 * ### video: /path/to/example.mp4, /backup/example.mp4
 * 
 * HTML output:
 * 
 * <video width="100%" controls>
 *   <source src="/path/to/example.mp4">
 *   <source src="/backup/example.mp4">
 * </video>
 */

const SPLIT = /,/;

module.exports = {
    type: 'heading',
    plugin: 'video',
    render: function (text) {
        text = text.trim();
        if (text.indexOf('//www.bilibili.com/html/html5player.html') >= 0) {
            return '<iframe style="width:100%; height:600px; border: 0" src="' + text + '"></iframe>';
        }
        let sources = text.split(SPLIT).map((s) => {
            return s && s.trim();
        }).filter((s) => {
            return s && s.trim();
        }).map((s) => {
            return '<source src="' + s + '">';
        }).join('');
        return '<video width="100%" controls>' + sources + '</video>\n';
    }
};
