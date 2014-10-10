// site_search.js

// using search engine to search 'http://www.google.com/search?q=keywords site:www.example.com'

function createSearchEngine(cfg) {
    var
        search_url = cfg.search_url,
        domain = cfg.domain,
        buildSearchUrl = function (q) {
            return search_url.replace('%s', encodeURIComponent(q + ' site:' + domain));
        };
    return {
        external: true,
        index: function (docs, callback) {
            process.nextTick(function() {
                callback(null, { result: 'index ok but depends on search engine.'});
            });
        },
        unindex: function (docs, callback) {
            process.nextTick(function() {
                callback(null, { result: 'unindex ok but depends on search engine.'});
            });
        },
        search: function (q, options, callback) {
            if (arguments.length === 2) {
                callback = options;
                options = undefined;
            }
            if (callback) {
                process.nextTick(function () {
                    callback(null, buildSearchUrl(q))
                });
                return;
            }
            return buildSearchUrl(q);
        }
    };
}

module.exports = {
    createSearchEngine: createSearchEngine
};
