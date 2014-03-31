// Page object:

var
    _ = require('lodash'),
    async = require('async'),
    crypto = require('crypto'),
    config = require('../config'),
    api = require('../api'),
    db = require('../db');

function Page(pageIndex, pageSize) {
    this.pageIndex = pageIndex ? pageIndex : 1;
    this.pageSize = pageSize ? 20 : pageSize;
    this.__itemCount = 0;

    this.__defineGetter__('itemCount', function() {
        return this.__itemCount;
    });

    this.__defineSetter__('itemCount', function(itemCount) {
        this.__itemCount = itemCount;
    });

    this.__defineGetter__('pageCount', function() {
        var total = this.__itemCount;
        if (total===0) {
            return 0;
        }
        return Math.floor(total / this.pageSize) + (total % this.pageSize===0 ? 0 : 1);
    });

    this.__defineGetter__('offset', function() {
        return this.pageSize * (this.pageIndex - 1);
    });

    this.__defineGetter__('limit', function() {
        return this.pageSize;
    });
}





exports = module.exports = {

    getPage: function(req, pageSize) {
        var index = parseInt(req.query.page);
        return new Page(isNaN(index) ? 1 : index, pageSize);
    },

    page: function(pageIndex, pageSize) {
        return new Page(pageIndex, pageSize);
    }
}
