'use strict';

// json schema.js

var
    _ = require('lodash'),
    api = require('./api'),
    constants = require('./constants'),
    jjv = require('jjv'),
    env = jjv();

env.defaultOptions.useDefault = true;
env.defaultOptions.removeAdditional = true;

var code2Message = {
    required: '参数不能为空',
    email: '无效的电子邮件',
    pattern: '格式无效',
    minLength: '不满足最少字符',
    maxLength: '超过了允许最大字符',
    minimum: '超出了最小允许范围',
    exclusiveMinimum: '超出了最小允许范围',
    maximum: '超出了最大允许范围',
    exclusiveMaximum: '超出了最大允许范围',
};

function translateMessage(field, invalids) {
    if (invalids.length === 0) {
        return '无效的值：' + field;
    }
    return code2Message[invalids[0]] || '无效的值' + field;
}

var createApiError = function (errors) {
    if (!errors.validation) {
        return api.invalidRequest('json', 'Invalid JSON request.');
    }
    var err = null;
    console.log('>>> ' + JSON.stringify(errors.validation));
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

var PROPERTY = {

    ID: {
        type: 'string',
        pattern: '^[0-9a-f]{50}$'
    },

    EMAIL: {
        type: 'string',
        maxLength: 100,
        pattern: '^(?:[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+\\.)*[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+@(?:(?:(?:[a-z0-9](?:[a-z0-9\\-](?!\\.)){0,61}[a-z0-9]?\\.)+[a-z0-9](?:[a-z0-9\\-](?!$)){0,61}[a-z0-9]?)|(?:\\[(?:(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\.){3}(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\]))$',
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
        maxLength: 1000,
        default: ''
    },

    ALIAS: {
        type: 'string',
        pattern: '^[a-z0-9\\_\\-]{1,50}$',
    },

    TEXT: {
        type: 'string',
        minLength: 1,
        maxLength: 65536, // 64K
    },

    TEXT_OPTIONAL: {
        type: 'string',
        maxLength: 65536, // 64K
        default: ''
    },

    TAGS: {
        type: 'string',
        maxLength: 100,
        default: ''
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
        uniqueItems: true,
        default: []
    },

    MIME: {
        type: 'string',
        pattern: '^[0-9a-z]{1,15}\\/[0-9a-z\\.\\-]{1,24}$'
    },

    FILE: {
        type: 'string',
        minLength: 1,
        maxLength: 1400000 // 1 MB binary, 1.33 M with base64
    },

    TIMESTAMP: {
        type: 'integer',
        minimum: 0,
        maximum: 32506358400000 // 3000-1-1 0:0:0 UTC
    },

    IMAGE: {
        type: 'string',
        minLength: 1,
        maxLength: 1400000 // 1MB before base64, 1.33M after base64
    }
};

var schemas = {
    authenticate: {
        type: 'object',
        properties: {
            email: PROPERTY.EMAIL,
            passwd: PROPERTY.PASSWD
        },
        required: ['email', 'passwd']
    },
    createCategory: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION
        },
        required: ['name']
    },
    updateCategory: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION
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
            description: PROPERTY.DESCRIPTION,
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
        required: ['category_id', 'name', 'content', 'image']
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





    //------
    createUser: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            email: {
                type: 'string',
                format: 'email'
            },
            passwd: PROPERTY.PASSWD,
            role: {
                type: 'integer',
                enum: [constants.role.STUDENT, constants.role.TEACHER, constants.role.EDITOR]
            },
            gender: {
                type: 'string',
                enum: ['male', 'female', ''],
                default: ''
            }
        },
        required: ['name', 'email', 'passwd', 'role']
    },
    createMessage: {
        type: 'object',
        properties: {
            from_id: PROPERTY.ID,
            to_id: PROPERTY.ID,
            name: PROPERTY.NAME,
            content: PROPERTY.TEXT
        },
        required: ['to_id', 'name', 'content']
    },
    createResource: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            data: {
                type: 'string',
                minLength: 1
            }
        },
        required: ['name', 'data']
    },
    createCourse: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            teacher_id: PROPERTY.ID,
            image: PROPERTY.IMAGE,
            description: PROPERTY.DESCRIPTION,
            price: {
                type: 'integer',
                minimum: 0,
                maximum: 10000
            },
            free_chapters: {
                type: 'integer',
                minimum: 0,
                maximum: 10,
                default: 0
            },
            difficulty: {
                type: 'integer',
                minimum: 1,
                maximum: 5
            },
            visible: {
                type: 'boolean'
            }
        },
        required: ['name', 'teacher_id', 'image', 'price', 'difficulty', 'visible']
    },
    updateCourse: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            teacher_id: PROPERTY.ID,
            image: PROPERTY.IMAGE,
            description: PROPERTY.DESCRIPTION,
            price: {
                type: 'integer',
                minimum: 0,
                maximum: 10000
            },
            free_chapters: {
                type: 'integer',
                minimum: 0,
                maximum: 10,
                default: 0
            },
            difficulty: {
                type: 'integer',
                minimum: 1,
                maximum: 5
            },
            visible: {
                type: 'boolean'
            }
        }
    },
    createChapter: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            visible: {
                type: 'boolean'
            }
        },
        required: ['name', 'visible']
    },
    updateChapter: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            description: PROPERTY.DESCRIPTION,
            visible: {
                type: 'boolean'
            }
        }
    },
    sortChapters: {
        type: 'object',
        properties: {
            chapter_ids: PROPERTY.ID_LIST
        },
        required: ['chapter_ids']
    },
    createSection: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            duration: PROPERTY.DURATION,
            visible: {
                type: 'boolean'
            },
            video_id: PROPERTY.ID,
            code_type: PROPERTY.CODE_TYPE,
            code_initial: PROPERTY.TEXT_OPTIONAL,
            code_check: PROPERTY.TEXT_OPTIONAL,
            content: PROPERTY.TEXT_OPTIONAL
        },
        required: ['name', 'duration', 'visible']
    },
    updateSection: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            duration: PROPERTY.DURATION,
            visible: {
                type: 'boolean'
            },
            video_id: PROPERTY.ID,
            code_type: PROPERTY.CODE_TYPE,
            code_initial: PROPERTY.TEXT_OPTIONAL,
            code_check: PROPERTY.TEXT_OPTIONAL,
            content: PROPERTY.TEXT_OPTIONAL
        }
    },
    sortSections: {
        type: 'object',
        properties: {
            section_ids: PROPERTY.ID_LIST
        },
        required: ['section_ids']
    },
    createTopic: {
        type: 'object',
        properties: {
            name: PROPERTY.NAME,
            section_id: PROPERTY.ID,
            tag: PROPERTY.DISCUSS_TAG,
            content: PROPERTY.TEXT
        },
        required: ['name', 'tag', 'content']
    },
    createReply: {
        type: 'object',
        properties: {
            content: PROPERTY.TEXT
        },
        required: ['content']
    }
}

_.each(schemas, function (v, k) {
    env.addSchema(k, v);
});

module.exports = {
    validate: function (schemaName, data) {
        var errors = env.validate(schemaName, data);
        if (errors !== null) {
            throw createApiError(errors);
        }
    }
};
