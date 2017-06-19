'use strict';
var nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'donantes.voluntarios.sangre@gmail.com',
        pass: 'gigoju16'
    }
});


module.exports = {
	init: function(app){
			
		app.post('/mail', function (req, res, next) {
			console.log(req.body);
			//setup email data with unicode symbols
			let mailOptions = {
				from: '"Donantes voluntarios de sangre" <donantes.voluntarios.sangre@gmail.com>', // sender address
				to: req.body.to, // list of receivers
				subject: req.body.subject, // Subject line
				text: req.body.body, // plain text body
				html: req.body.body // html body
			};
			// send mail with defined transport object
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.log("Error enviando mail", error);
					return res.status(500).send('No se pudo enviar el mail');
				}
				console.log('Message %s sent: %s', info.messageId, info.response);
				return res.jsonp({status: "ok"});
			});
		});
	}
};

