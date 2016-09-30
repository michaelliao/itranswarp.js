// webpage.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Webpage',
    table: 'pages',
    fields: {
        alias: {
            type: dbtypes.STRING(100),
            unique: true
        },
        content_id: dbtypes.ID,
        draft: dbtypes.BOOLEAN,
        name: dbtypes.STRING(100),
        tags: dbtypes.STRING(1000)
    }
};
