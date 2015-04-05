'use strict';

// base.js

var
    _ = require('lodash'),
    next_id = require('./_id');

/**
 * automatically add following fields as well as hooks to each model:
 *   id: varchar(50), not null, the primary key.
 *   created_at: bigint, not null, the created timestamp.
 *   updated_at: bigint, not null, the updated timestamp.
 *   version: bigint, not null, the increased version number starts from 0.
 */
function defineModel(warp, name, cols, opts) {
    var
        columns = cols.slice(0, cols.length),
        options = _.clone(opts || []),
        fnBeforeCreate,
        fnBeforeUpdate;

    // add id as primary key:
    columns.unshift({
        name: 'id',
        type: 'varchar(50)',
        primaryKey: true,
        defaultValue: next_id
    });
    // add created_at, updated_at and version:
    columns.push({
        name: 'created_at',
        type: 'bigint',
        index: true
    });
    columns.push({
        name: 'updated_at',
        type: 'bigint'
    });
    columns.push({
        name: 'version',
        type: 'bigint',
        defaultValue: 0
    });
    fnBeforeCreate = options.beforeCreate;
    options.beforeCreate = function (obj) {
        if (fnBeforeCreate) {
            fnBeforeCreate(obj);
        }
        if (!obj.id) {
            obj.id = next_id();
        }
        obj.created_at = obj.updated_at = Date.now();
    };
    fnBeforeUpdate = options.beforeUpdate;
    options.beforeUpdate = function (obj) {
        if (fnBeforeUpdate) {
            fnBeforeUpdate(obj);
        }
        obj.updated_at = Date.now();
        obj.version++;
    };
    return warp.define(name, columns, options);
}

module.exports = {

    column_id: function (name, options) {
        return _.merge({
            name: name,
            type: 'varchar(50)'
        }, options || {});
    },

    column_bigint: function (name, options) {
        return _.merge({
            name: name,
            type: 'bigint',
            defaultValue: 0
        }, options || {});
    },

    column_varchar_50: function (name, options) {
        return _.merge({
            name: name,
            type: 'varchar(50)'
        }, options || {});
    },

    column_varchar_100: function (name, options) {
        return _.merge({
            name: name,
            type: 'varchar(100)'
        }, options || {});
    },

    column_varchar_500: function (name, options) {
        return _.merge({
            name: name,
            type: 'varchar(500)'
        }, options || {});
    },

    column_varchar_1000: function (name, options) {
        return _.merge({
            name: name,
            type: 'varchar(1000)',
            defaultValue: ''
        }, options || {});
    },

    column_boolean: function (name, options) {
        return _.merge({
            name: name,
            type: 'boolean',
            defaultValue: false
        }, options || {});
    },

    column_text: function (name, options) {
        return _.merge({
            name: name,
            type: 'mediumtext'
        }, options || {});
    },

    column_blob: function (name, options) {
        return _.merge({
            name: name,
            type: 'mediumblob'
        }, options || {});
    },

    defineModel: defineModel
};
