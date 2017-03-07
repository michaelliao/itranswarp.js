/**
 * Page object.
 * 
 * @param {number} index starts from 1.
 * @param {number} size default to 10.
 */
function Page(index, size=10) {
    this.index = (index < 1) ? 1 : index;
    this.size = ((size < 10) || (size > 100)) ? 10 : size;
    this.__total = 0;

    this.__defineGetter__('total', function () {
        return this.__total;
    });

    this.__defineSetter__('total', function (val) {
        this.__total = val;
    });

    this.__defineGetter__('pages', function () {
        var total = this.__total;
        if (total === 0) {
            return 0;
        }
        return Math.floor(total / this.size) + (total % this.size === 0 ? 0 : 1);
    });

    this.__defineGetter__('isEmpty', function () {
        return this.__total === 0;
    });

    this.__defineGetter__('offset', function () {
        return this.size * (this.index - 1);
    });

    this.__defineGetter__('limit', function () {
        return this.size;
    });

    this.__defineGetter__('list', function () {
        // display for UI:
        if (this.pages <= 1) {
            return [1];
        }
        if (this.pages === 2) {
            return [1, 2];
        }
        var
            i,
            list = [1],
            start = Math.max(2, index - 4),
            end = Math.min(this.pages-1, index + 4);
        if (start > 2) {
            list.push('...');
        }
        for (i=start; i<=end; i++) {
            list.push(i);
        }
        if (end < (this.pages-1)) {
            list.push('...');
        }
        list.push(this.pages);
        return list;
    });

    this.toJSON = function () {
        return {
            index: this.index,
            size: this.size,
            total: this.total,
            pages: this.pages,
            list: this.list
        };
    };

    this.range = function (n) {
        if (n === undefined || n < 0) {
            n = 5;
        }
        var
            i,
            arr = [],
            min = this.index - n,
            max = this.index + n;
        if (min < 1) {
            min = 1;
        }
        if (max > this.pages) {
            max = this.pages;
        }
        for (i = min; i <= max; i++) {
            arr.push(i);
        }
        return arr;
    };
}

module.exports = Page;
