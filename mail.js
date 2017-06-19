'use strict';
const nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'donantes.voluntarios.sangre@gmail.com',
        pass: 'gigoju16'
    }
});

// setup email data with unicode symbols
let mailOptions = {
    from: '"Donantes voluntarios de sangre" <donantes.voluntarios.sangre@gmail.com>', // sender address
    to: 'gino.scarpino@gmail.com', // list of receivers
    subject: 'Mail de prueba', // Subject line
    text: 'Esto es una prueba', // plain text body
    html: '<b>Lala </b> lala' // html body
};

// send mail with defined transport object
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
});