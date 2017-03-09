/**
 * App entry.
 */

const
    logger = require('./logger'),
    app = require('./app');

app.listen(2015);

logger.info(`application start in ${process.isProductionMode ? 'production' : 'development'} mode at 2015...`);
