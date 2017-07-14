'use strict';

/**
 * Start app.
 */

const
    PORT = 2017,
    logger = require('./logger'),
    app = require('./app');

app.listen(PORT);

logger.info(`application version:${process.appVersion} start in ${process.isProduction ? 'production' : 'development'} mode at ${PORT}...`);
