// app theme:

exports = module.exports = {
    themePath: function(path) {
        return 'themes/default/' + path;
    },
    themeDefaults: function(req, options) {
        var model = options || {};
        model.__theme__ = 'themes/default/';
        model.__user__ = req.user;
        model.__website__ = {
            name: 'Website Name',
            description: 'website blablabla...',
            custom_header: '',
            custom_footer: ''
        };
        return model;
    }
};
