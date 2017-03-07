/**
 * logger support. Usage:
 * 
 * const logger = require('./logger.js');
 * logger.info('blablabla...');
 * 
 * author: Michael Liao
 */
const
    winston = require('winston'),
    config = require('./config');

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            name: 'console',
            colorize: true,
            level: 'info',
            timestamp: true
        }),
        new winston.transports.File({
            name: 'info-file',
            filename: config.log.dir + '/itranswarp-info.log',
            level: 'info',
            json: false,
            timestamp: function () {
                return new Date().toString();
            }
        }),
        new winston.transports.File({
            name: 'error-file',
            filename: config.log.dir + '/itranswarp-error.log',
            level: 'error',
            json: false,
            timestamp: function () {
                return new Date().toString();
            }
        })
    ]
});

module.exports = logger;
