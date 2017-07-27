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
    SMTP_HOST = config.smtp.host,
    SMTP_PORT = config.smtp.port,
    SMTP_SECURE = config.smtp.secure,
    SMTP_FROM = config.smtp.from,
    SMTP_USER = config.smtp.user,
    SMTP_PASSWORD = config.smtp.password;

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
        user: SMTP_USER,
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
