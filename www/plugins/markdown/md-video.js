/**
 * Plugin for video.
 * 
 * Markdown syntax:
 * 
 * ### video:/path/to/mp4
 * 
 * HTML output:
 * 
 * <video width="100%" controls>
 *   <source src="/path/to/mp4">
 * </video>
 */

module.exports = {
    type: 'heading',
    plugin: 'video',
    render: function (text) {
        return '<video width="100%" controls><source src="' + text + '"></video>\n';
    }
};
