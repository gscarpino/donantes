var k = "AKIAJ35YNBNMOH5A25OQ";
var s = "P0/uB9By8L8bV8jZ86aqy3afqGM349Hh2HkBvadP";

var ses = require('node-ses')
  , client = ses.createClient({ key: k, secret: s , amazon: 'https://email.us-west-2.amazonaws.com'});

client.sendEmail({
 to: 'gino.scarpino@gmail.com'
 , from: 'donantes.voluntarios.sangre@gmail.com'
 , subject: 'Prueba de Amazon SES'
 , message: 'Hola! <b>yes</b> vamoooo los pibe'
 , altText: 'hola'
}, function (err, data, res) {
if(err){
	console.log("Error enviando mail: ", err);
return;
}
var _res = res.toJSON();
if(_res.statusCode != 200){
console.log("Error (" + _res.statusCode + ")")
}
else{
console.log("Mail enviado correctamente.")
}
});
