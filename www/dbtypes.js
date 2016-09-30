// define db types:

const Sequelize = require('sequelize');

const TYPES = ['STRING', 'INTEGER', 'BIGINT', 'TEXT', 'DOUBLE', 'DATEONLY', 'BOOLEAN', 'BLOB'];

var exp = {
    ID: Sequelize.STRING(50)
};

for (let type of TYPES) {
    exp[type] = Sequelize[type];
}

module.exports = exp;
