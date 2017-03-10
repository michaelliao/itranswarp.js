/**
 * Test fixture for db.
 */

// change root password before run db-related test:
const ROOT_PASSWORD = 'password';

// test db:
const TEST_DB = 'test';

const config = require('../config');

config.db.username = 'root';
config.db.password = ROOT_PASSWORD;
config.db.database = TEST_DB;

/**
 * will drop all tables in db.
 */
async function dbsetup() {
    var db = require('../db');
    await db.sync();
    return db;
}

module.exports = dbsetup;
