

client.sendEmail({
 to: 'gino.scarpino@gmail.com'
 , from: 'donantes.voluntarios.sangre@gmail.com'
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
