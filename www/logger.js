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
    moment = require('moment'),
    stackTrace = require('stack-trace'),
    winston = require('winston'),

    dateFormat = function () {
        return moment().format('YYYY-MM-DD HH:mm:ss:SSS');
    },

    logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                name: 'console',
                colorize: true,
                level: 'info',
                timestamp: dateFormat
            }),
            new winston.transports.File({
                name: 'info-file',
                dirname: '/tmp',
                filename: 'itranswarp-info.log',
                level: 'info',
                json: false,
                maxsize: 100 * 1024 * 1024, // 100M
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
                maxsize: 100 * 1024 * 1024, // 100M
                maxFiles: 50,
                timestamp: function () {
                    return new Date().toString();
                }
            })
        ]
    });

    let originalMethod=logger.info;
    logger.info=function(){
        let cellSite=stackTrace.get()[1];
        originalMethod.apply(logger,[arguments[0]+'\n'+'    ',{filePath:cellSite.getFileName(),lineNumber:cellSite.getLineNumber()}]);
    };

module.exports = logger;
