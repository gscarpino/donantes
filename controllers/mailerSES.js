var fs = require('fs');
var config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8'));

var ses = require('node-ses'),
    client = ses.createClient({
        key: config.amazon.ses.key,
        secret: config.amazon.ses.secret,
        amazon: config.amazon.ses.url
    });


module.exports = {
    init: function(app){

        app.post('/mail', function (req, res, next) {
            console.log(req.body);
            //setup email data with unicode symbols
            //GENERAR TOKEN PARA DESUSCRIBIR: puede ser _id de mongo?
            client.sendEmail({
                from: '"Donantes voluntarios de sangre" <donantes.voluntarios.sangre@gmail.com>', // sender address
                to: req.body.to, // list of receivers
                subject: req.body.subject, // Subject line
                altText: req.body.body, // plain text body
                message: req.body.body // html body
            }, function (err, data, response) {
                if(err){
                    console.log("Error enviando mail: ", err);
                    return res.status(500).send('No se pudo enviar el mail');
                }
                var _res = response.toJSON();
                if(_res.statusCode != 200){
                    console.log("Error (" + _res.statusCode + ")")
                    return res.status(500).send('No se pudo enviar el mail');
                }
                else{
                    console.log("Mail enviado correctamente.");
                    return res.jsonp({status: "ok"});
                }
            });
        });
    }
};
