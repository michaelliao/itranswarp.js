'use strict';

/**
 * Wiki api.
 * 
 * author: Michael Liao
 */
const
    db = require('../db'),
    md = require('../md'),
    Text = db.Text,
    nextId = db.nextId;

/**
 * Attach 'content' property by finding text using 'content_id'.
 * Return the entity object.
 * 
 * @param {*} entity Entity object. 
 */
async function attachContent(entity) {
    let text = await Text.findById(entity.content_id);
    entity.content = text.value;
    return entity;
}

async function createText(ref_id, content_id, content) {
    return await Text.create({
        id: content_id,
        ref_id: ref_id,
        value: content
    });
}

module.exports = {

    createText: createText,

    attachContent: attachContent

};
