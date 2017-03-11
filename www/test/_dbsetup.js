'use strict';

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
 * 
 * Export global variable: $ALL
 */
async function dbsetup() {
    var db = require('../db');
    await db.sync();
    global.$ALL = {
        where: {
            created_at: {
                $gte: 0
            }
        }
    };
    return db;
}

module.exports = dbsetup;
