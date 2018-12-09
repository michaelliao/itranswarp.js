'use strict';

/**
 * Send mail.
 * 
 * author: Michael Liao
 */
const
    nodemailer = require('nodemailer'),
    logger = require('./logger'),
    md = require('./md'),
    config = require('./config'),
    SMTP_HOST = config.smtp_host,
    SMTP_PORT = parseInt(config.smtp_port),
    SMTP_SECURE = config.smtp_secure === 'true',
    SMTP_FROM = config.smtp_from,
    SMTP_USERNAME = config.smtp_username,
    SMTP_PASSWORD = config.smtp_password;

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD
    }
});

function sendmail(toAddr, subject, htmlBody) {
    let mailOptions = {
        from: SMTP_FROM,
        to: toAddr,
        subject: subject,
        text: md.htmlToText(htmlBody),
        html: htmlBody
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            logger.error('Failed to send mail to: ' + toAddr, err);
        } else {
            logger.info('Mail sent to: ' + toAddr + ', message id: ' + info.messageId);
        }
    });
}

module.exports = {
    sendmail: sendmail
};
