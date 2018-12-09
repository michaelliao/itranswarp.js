'use strict';

/**
 * logger support. Usage:
 * 
 * const logger = require('./logger');
 * logger.info('blablabla...');
 * 
 * this logger is a wrapper for winston logger.
 * 
 * author: Michael Liao
 */
const
    winston = require('winston'),
    logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                name: 'console',
                colorize: true,
                level: 'info',
                timestamp: true
            }),
            new winston.transports.File({
                name: 'info-file',
                dirname: '/tmp',
                filename: 'itranswarp-info.log',
                level: 'info',
                json: false,
                maxsize: 50 * 1024 * 1024, // 50M
                maxFiles: 20,
                timestamp: function () {
                    return new Date().toString();
                }
            }),
            new winston.transports.File({
                name: 'error-file',
                dirname: '/tmp',
                filename: 'itranswarp-error.log',
                level: 'error',
                json: false,
                maxsize: 50 * 1024 * 1024, // 50M
                maxFiles: 20,
                timestamp: function () {
                    return new Date().toString();
                }
            })
        ]
    });

module.exports = logger;
