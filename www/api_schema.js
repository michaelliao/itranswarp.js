'use strict';

/**
 * Validate JSON using schema.
 * 
 * @author: Michael Liao
 */

const
    _ = require('lodash'),
    api = require('./api'),
    logger = require('./logger'),
    constants = require('./constants'),
    jjv = require('jjv'),
    env = jjv();

env.defaultOptions.useDefault = true;
env.defaultOptions.removeAdditional = true;
env.addCheck('nonEmpty', (v, flag) => {
    if (flag) {
        if (v) {
            return v.trim() !== '';
        }
        return false;
    }
    return true;
});

const code2Message = {
    required: 'Parameter is required',
    email: 'Invalid email',
    pattern: 'Invalid format',
    minLength: '不满足最少字符',
    maxLength: '超过了允许最大字符',
    minimum: '超出了最小允许范围',
    exclusiveMinimum: '超出了最小允许范围',
    maximum: '超出了最大允许范围',
    exclusiveMaximum: '超出了最大允许范围',
};

function translateMessage(field, invalids) {
    if (invalids.length === 0) {
        return 'Invalid value of field: ' + field;
    }
    let msg = code2Message[invalids[0]];
    if (msg) {
        return msg;
    }
    return 'Invalid value of field: ' + field;
}

function createApiError(errors) {
    if (!errors.validation) {
        return api.invalidRequest('json', 'Invalid JSON request.');
    }
    let err = null;
    _.each(errors.validation, function (v, k) {
        if (err === null) {
            err = api.invalidParam(k, translateMessage(k, Object.getOwnPropertyNames(v)));
            return false;
        }
    });
    if (err === null) {
        return api.invalidRequest('json', 'Invalid JSON request.');
    }
    err.validation = errors.validation;
    return err;
}

// common patterns:

const PROPERTY = {

    ID: {
        type: 'string',
        pattern: '^[0-9a-f]{50}$'
    },

    ID_EMPTY: {
        type: 'string',
        pattern: '^([0-9a-f]{50})?$'
    },

    EMAIL: {
        type: 'string',
        maxLength: 100,
        pattern: '^(?:[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+\\.)*[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+@(?:(?:(?:[a-z0-9](?:[a-z0-9\\-](?!\\.)){0,61}[a-z0-9]?\\.)+[a-z0-9](?:[a-z0-9\\-](?!$)){0,61}[a-z0-9]?)|(?:\\[(?:(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\.){3}(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\]))$',
    },

    ROLE: {
        type: 'integer',
        enum: [10, 100, 1000, 10000]
    },

    URL: {
        type: 'string',
        minLength: 1,
        maxLength: 1000,
        pattern: '^\\s*[^\\s]+.*$'
    },

    PASSWD: {
        type: 'string',
        pattern: '^[a-f0-9]{40}$'
    },

    NAME: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^\\s*[^\\s]+.*$'
    },

    DESCRIPTION: {
        type: 'string',
        minLength: 1,
        maxLength: 1000
    },

    DESCRIPTION_OPTIONAL: {
        type: 'string',
        maxLength: 1000,
        default: ''
    },

    ALIAS: {
        type: 'string',
        pattern: '^[a-z0-9\\_\\-]{1,50}$',
    },

    TEXT: {
        type: 'string',
        nonEmpty: true,
        minLength: 1,
        maxLength: 65536, // 64K
    },

    TEXT_OPTIONAL: {
        type: 'string',
        maxLength: 65536, // 64K
        default: ''
    },

    SETTING: {
        type: 'string',
        minLength: 0,
        maxLength: 16384, // 16K
    },

    TAGS: {
        type: 'string',
        maxLength: 100,
        default: ''
    },

    TAG: {
        type: 'string',
        minLength: 1,
        maxLength: 50,
        pattern: '^\\s*[^\\s]+.*$'
    },

    CODE_TYPE: {
        type: 'string',
        enum: ['', 'html', 'css', 'javascript', 'java', 'csharp', 'php'],
        default: ''
    },

    ID_LIST: {
        type: 'array',
        items: {
            type: 'string',
            pattern: '^[0-9a-f]{50}$'
        },
        minItems: 1,
        uniqueItems: true
    },

    DATE: {
        type: 'string',
        pattern: '^[1-2][0-9]{3}\\-[0-1][0-9]\\-[1-3][0-9]$'
    },

    MIME: {
        type: 'string',
        pattern: '^[0-9a-z]{1,15}\\/[0-9a-z\\.\\-]{1,24}$'
    },

    FILE: {
        type: 'string',
        minLength: 10,
        maxLength: 1400000 // 1MB before base64, 1.33M after base64
    },

    TIMESTAMP: {
        type: 'integer',
        minimum: 0,
        maximum: 32506358400000 // 3000-1-1 0:0:0 UTC
    },

    PRICE: {
        type: 'integer',
        minimum: 1,
        maximum: 1000000
    },

    INTEGER: {
        type: 'integer'
    },

    NUM_OF_ADSLOT: {
        type: 'integer',
        minimum: 1,
        maximum: 10
    },

    WIDTH_OR_HEIGHT: {
        type: 'integer',
        minimum: 10,
        maximum: 1024
    }
};

const schemas = {
    authenticate: {
        type: 'object',
        properties: {
            email: PROPERTY.EMAIL,
            passwd: PROPERTY.PASSWD
        },
        required: ['email', 'passwd']
    },
    updateUserRole: {
        type: 'object',
        properties: {
            role: PROPERTY.ROLE
        },
        required: ['role']
    },
    lockUser: {
        type: 'object',
        properties: {
            locked_until: PROPERTY.TIMESTAMP
        },
        required: ['locked_until']
    },
    createCategory: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            tag: PROPERTY.TAG,
            description: PROPERTY.DESCRIPTION_OPTIONAL
        },
        required: ['name', 'tag']
    },
    updateCategory: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            tag: PROPERTY.TAG,
            description: PROPERTY.DESCRIPTION_OPTIONAL
        }
    },
    sortCategories: {
        type: 'object',
        properties: {
            ids: PROPERTY.ID_LIST
        },
        required: ['ids']
    },
    createNavigation: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            url: PROPERTY.URL
        },
        required: ['name', 'url']
    },
    sortNavigations: {
        type: 'object',
        properties: {
            ids: PROPERTY.ID_LIST
        },
        required: ['ids']
    },
    updateNavigation: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            url: PROPERTY.URL
        }
    },
    createWebpage: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            tags: PROPERTY.TAGS,
            content: PROPERTY.TEXT,
            alias: PROPERTY.ALIAS,
            draft: {
                type: 'boolean',
                default: false
            }
        },
        required: ['name', 'alias', 'content']
    },
    updateWebpage: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            tags: PROPERTY.TAGS,
            content: PROPERTY.TEXT,
            alias: PROPERTY.ALIAS,
            draft: {
                type: 'boolean'
            }
        }
    },
    createAttachment: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION_OPTIONAL,
            mime: PROPERTY.MIME,
            data: PROPERTY.FILE
        },
        required: ['name', 'data']
    },
    createArticle: {
        type: 'object',
        properties: {
            category_id: PROPERTY.ID,
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            tags: PROPERTY.TAGS,
            publish_at: PROPERTY.TIMESTAMP,
            content: PROPERTY.TEXT,
            image: PROPERTY.FILE
        },
        required: ['category_id', 'name', 'description', 'content', 'image']
    },
    updateArticle: {
        type: 'object',
        properties: {
            category_id: PROPERTY.ID,
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            tags: PROPERTY.TAGS,
            publish_at: PROPERTY.TIMESTAMP,
            content: PROPERTY.TEXT,
            image: PROPERTY.FILE
        }
    },
    createWiki: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            tag: PROPERTY.TAG,
            content: PROPERTY.TEXT,
            image: PROPERTY.FILE
        },
        required: ['name', 'description', 'content', 'image']
    },
    updateWiki: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            tag: PROPERTY.TAG,
            content: PROPERTY.TEXT,
            image: PROPERTY.FILE
        }
    },
    createWikiPage: {
        type: 'object',
        properties: {
            parent_id: PROPERTY.ID_EMPTY,
            name: PROPERTY.NAME,
            content: PROPERTY.TEXT
        },
        required: ['parent_id', 'name', 'content']
    },
    updateWikiPage: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            content: PROPERTY.TEXT
        },
    },
    moveWikiPage: {
        type: 'object',
        properties: {
            parent_id: PROPERTY.ID_EMPTY,
            index: {
                type: 'integer',
                minimum: 0
            }
        },
        required: ['parent_id', 'index']
    },
    createBoard: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            tag: PROPERTY.TAG
        },
        required: ['name', 'description', 'tag']
    },
    updateBoard: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            tag: PROPERTY.TAG
        }
    },
    sortBoards: {
        type: 'object',
        properties: {
            ids: PROPERTY.ID_LIST
        },
        required: ['ids']
    },
    createTopic: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            tags: PROPERTY.TAGS,
            content: PROPERTY.TEXT
        },
        required: ['name', 'content']
    },
    createReply: {
        type: 'object',
        properties: {
            content: PROPERTY.TEXT
        },
        required: ['content']
    },
    updateWebsiteSettings: {
        type: 'object',
        properties: {
            name: PROPERTY.SETTING,
            description: PROPERTY.SETTING,
            keywords: PROPERTY.SETTING,
            xmlns: PROPERTY.SETTING,
            custom_header: PROPERTY.SETTING,
            custom_footer: PROPERTY.SETTING
        }
    },
    updateSnippets: {
        type: 'object',
        properties: {
            body_top: PROPERTY.SETTING,
            body_bottom: PROPERTY.SETTING,
            sidebar_left_top: PROPERTY.SETTING,
            sidebar_left_bottom: PROPERTY.SETTING,
            sidebar_right_top: PROPERTY.SETTING,
            sidebar_right_bottom: PROPERTY.SETTING,
            content_top: PROPERTY.SETTING,
            content_bottom: PROPERTY.SETTING,
            index_top: PROPERTY.SETTING,
            index_bottom: PROPERTY.SETTING,
            http_404: PROPERTY.SETTING
        }
    },
    createComment: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            tag: PROPERTY.TAG,
            content: PROPERTY.TEXT
        },
        required: ['name', 'tag', 'content']
    },
    createAdSlot: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            price: PROPERTY.PRICE,
            width: PROPERTY.WIDTH_OR_HEIGHT,
            height: PROPERTY.WIDTH_OR_HEIGHT,
            num_slots: PROPERTY.NUM_OF_ADSLOT,
            num_auto_fill: PROPERTY.NUM_OF_ADSLOT,
            auto_fill: PROPERTY.TEXT
        },
        required: ['name', 'description', 'price', 'width', 'height', 'num_slots', 'num_auto_fill', 'auto_fill']
    },
    updateAdSlot: {
        type: 'object',
        properties: {
            description: PROPERTY.DESCRIPTION,
            price: PROPERTY.PRICE,
            num_slots: PROPERTY.NUM_OF_ADSLOT,
            num_auto_fill: PROPERTY.NUM_OF_ADSLOT,
            auto_fill: PROPERTY.TEXT
        },
        required: ['description', 'price', 'num_slots', 'num_auto_fill', 'auto_fill']
    },
    createAdPeriod: {
        type: 'object',
        properties: {
            user_id: PROPERTY.ID,
            adslot_id: PROPERTY.ID,
            start_at: PROPERTY.DATE,
            months: PROPERTY.INTEGER
        },
        required: ['user_id', 'adslot_id', 'start_at', 'months']
    },
    extendAdPeriod: {
        type: 'object',
        properties: {
            months: PROPERTY.INTEGER
        },
        required: ['months']
    },
    createAdMaterial: {
        type: 'object',
        properties: {
            url: PROPERTY.URL,
            weight: PROPERTY.INTEGER,
            start_at: PROPERTY.DATE,
            end_at: PROPERTY.DATE,
            image: PROPERTY.FILE
        }
    }
}

_.each(schemas, function (v, k) {
    env.addSchema(k, v);
});

module.exports = {
    validate: (schemaName, data) => {
        let errors = env.validate(schemaName, data);
        if (errors !== null) {
            logger.warn('api:check schema failed.');
            throw createApiError(errors);
        }
    }
};
