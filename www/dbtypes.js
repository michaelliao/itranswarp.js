'use strict';

// define db types:

const
    Sequelize = require('sequelize'),
    TYPES = ['STRING', 'INTEGER', 'BIGINT', 'TEXT', 'DOUBLE', 'DATEONLY', 'BOOLEAN', 'BLOB'];

let exp = {
    ID: Sequelize.STRING(50)
};

for (let type of TYPES) {
    exp[type] = Sequelize[type];
}

module.exports = exp;
