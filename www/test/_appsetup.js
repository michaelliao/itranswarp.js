'use strict';

/**
 * Test fixture for app.
 */

const
    dbsetup = require('./_dbsetup'), // <-- MUST be import first!
    app = require('../app'),
    crypto = require('crypto'),
    constants = require('../constants'),
    db = require('../db'),
    User = db.User,
    LocalUser = db.LocalUser;

function generatePassword(id, email) {
    var hashPasswd = crypto.createHash('sha1').update(email + ':password').digest('hex');
    return crypto.createHash('sha1').update(id + ':' + hashPasswd).digest('hex');
}

/**
 * Will export global variables:
 * 
 * server: $SERVER
 * users: $AMDIN, $EDITOR, $CONTRIB, $SUBS, $LOCKED.
 * function: auth(user)
 */
async function appsetup() {
    await dbsetup();
    // create default users:
    const
        userParams = [
            // key,      email,                    role,                       locked
            ['$ADMIN',   'admin@itranswarp.com',   constants.role.ADMIN,       false],
            ['$EDITOR',  'editor@itranswarp.com',  constants.role.EDITOR,      false],
            ['$CONTRIB', 'contrib@itranswarp.com', constants.role.CONTRIBUTOR, false],
            ['$SUBS',    'subs@itranswarp.com',    constants.role.SUBSCRIBER,  false],
            ['$LOCKED',  'locked@itranswarp.com',  constants.role.SUBSCRIBER,  true]
        ];
    var param;
    for (param of userParams) {
        var
            key = param[0],
            email = param[1],
            role = param[2],
            locked = param[3],
            local_id = db.nextId(),
            user, local_user;
        user = await User.create({
            email: email,
            role: role,
            locked_until: locked ? Date.now() + 600000 : 0,
            name: email.substring(0, email.indexOf('@')),
            image_url: 'http://www.itranswarp.com/test.jpg'
        });
        local_user = await LocalUser.create({
            id: local_id,
            user_id: user.id,
            passwd: generatePassword(local_id, email)
        });
        global[key] = user;
    }
    global.auth = function (user) {
        let hashedPasswd = crypto.createHash('sha1').update(user.email + ':password').digest('hex');
        return 'Basic ' + Buffer.from(user.email + ':' + hashedPasswd).toString('base64');
    }
    global['$SERVER'] = app.listen(19090);
}

module.exports = appsetup;
