var fs = require('fs'),
    crypto = require('crypto'),
    config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8')),
    request = require('request'),
    hooks = require('hook_manager').init(config),
    multiparty = require('connect-multiparty'),
    multipartyMiddleware = multiparty({ uploadDir: './public/imgs/' });

var list = {
    exchanges: ['MAILER'],
    routingKey: "donantes.mail.send",
    event: "send"
}

var imageDiv = "<div style='width: 100%; margin-left: auto; margin-right: auto; text-align: center'>" +
    "<img src='https://donantesvoluntariosdesangre.com.ar/static/imgs/{{URL}}' style='max-width:600px;'></div>";

module.exports = {
    init: function(app, models){

        app.post('/mail/massive', multipartyMiddleware, function (req, res) {

            if(!req.body.data){
                return res.status(400).send('Url malformed');
            }

            var data = JSON.parse(req.body.data);

            var headerDiv = "", footerDiv = "";

            if(req.files.headerImg){
                headerDiv = imageDiv.replace("{{URL}}", req.files.headerImg.path.substring(req.files.headerImg.path.lastIndexOf("/") + 1));
            }

            if(req.files.footerImg){
                footerDiv = imageDiv.replace("{{URL}}", req.files.footerImg.path.substring(req.files.footerImg.path.lastIndexOf("/") + 1));
            }

            var mailBody = headerDiv + "<br>" + data.body + "<br>" + footerDiv;

            var query = {
                services: req.user.service,
                mails:{
                    $ne: []
                },
                $or: [
                    {
                        lastDonation: {
                            $gt: new Date("2016-01-01 00:00:00")
                        }
                    },
                    {
                        lastDonation: {
                            $exists: false
                        }
                    }
                ]
            };

            var mailsToSend = [];
            models.donors
                .find(query, {mails: 1, _id: -1})
                .populate('services')
                .sort({mails: 1})
                .exec(function(err, results){
                    if(err){
                        console.log("Error buscando en la base de datos");
                        console.log(err);
                        return res.status(500).send('No se encontro al donante');
                    }

                    if(results){
                        for(var i = 0; i < results.length; i++){
                            var _mails = results[i].toObject().mails;
                            _mails.forEach(function(aMail){
                                mailsToSend.push(aMail.toLowerCase().trim().replace("ñ", "n"));
                            });
                        }

                        hooks.invoke(list, {to: mailsToSend, body: mailBody, subject: data.subject}, function(){
                            return res.jsonp({status: "ok"});
                        })
                    }
                    else
                        return res.status(404).send('No se encontro al donante');
                });
        });

        app.post('/mail', function (req, res) {
            if(!req.body.body){
                console.log("Error: mail sin body");
                return res.status(400).send('Url malformed');
            }

            if( !req.body.query && (!req.body.to || req.body.to.length == 0) ){
                console.log("Error: no query or to");
                return res.status(400).send('Url malformed');
            }

            //TODO: sacar el sender desde la info del Servicio
            req.body.sender = '"Hemoterapia Hospital Gutierrez" <donantes.voluntarios.sangre@gmail.com>';
            if( req.body.query ){
                var mailsToSend = [];
                req.body.query.services = req.user.service;
                models.donors
                    .find(req.body.query, {mails: 1, _id: -1})
                    .populate('services')
                    .sort({mails: 1})
                    .exec(function(err, results){
                        if(err){
                            console.log("Error buscando en la base de datos");
                            console.log(err);
                            return res.status(500).send('No se encontro al donante');
                        }
                        if(results){
                            for(var i = 0; i < results.length; i++){
                                var _mails = results[i].toObject().mails;
                                _mails.forEach(function(aMail){
                                    mailsToSend.push(aMail.toLowerCase());
                                });
                            }
                            if(mailsToSend.length > 0){
                                req.body.to = mailsToSend;
                                hooks.invoke(list, req.body, function(){
                                    return res.jsonp({status: "ok"});
                                });
                            }
                            else{
                                return res.status(404).send('No se encontraron donantes');
                            }
                        }
                        else{
                            return res.status(404).send('No se encontraron donantes');
                        }
                    });
            }
            else{
                hooks.invoke(list, req.body, function(){
                    return res.jsonp({status: "ok"});
                });
            }
        });

        app.post('/unsuscribe', function(req, res){
            console.log("body", req.body)
            if(!req.body.email || !req.body.response){
                return res.status(400).send('Url malformed');
            }
            var args = {
                url: "https://www.google.com/recaptcha/api/siteverify",
                form: {
                    secret: "6Lf5eS0UAAAAANetrh1ARqfm0oqWVMMuUMdEcKZm",
                    response: req.body.response
                }
            }
            request.post(args, function(err, response, body){
                if(typeof body == "string"){
                    body = JSON.parse(body);
                }
                if(body.success){
                    var hash = crypto.createHash('DSA-SHA1');
                    var ts = (new Date()).getTime();
                    hash.update(ts + req.body.email);
                    var toHash = hash.digest('hex');

                    models.donors.findOne({mails: req.body.email}, function(errFind, donor){
                        if(errFind){
                            console.log("Error with Mongo: ", errFind);
                            return res.status(500).send('No se pudo iniciar la desuscripción');
                        }
                        if(!donor){
                            console.log("Donor doesnt exists with email: ", req.body.email);
                            return res.status(403).send('No se pudo iniciar la desuscripción');
                        }
                        donor.unsuscribeToken = toHash;
                        donor.save(function(errSave){
                            if(errSave){
                                console.log("Error with Mongo: ", errSave);
                                return res.status(500).send('Error procesando la desuscripción');
                            }
                            var message = {
                                to: req.body.email,
                                subject: "Desuscripción de Donantes Voluntarios de Sangre",
                                body: "Haga click <a href='https://donantesvoluntariosdesangre.com.ar/#/unsuscribed/" + toHash + "' target='_blank'>aquí</a> para confirmar"
                            }


                            hooks.invoke(list, message, function(){
                                return res.jsonp({status: "ok"});
                            });
                        });
                    });
                }
                else{
                    return res.status(401).send('Not authorized');
                }
            });
        });

        app.post('/unsuscribed/:t', function(req, res){
            if(!req.params.t){
                return res.status(401).send('Not authorized');
            }
            else{
                models.donors.findOne({unsuscribeToken: req.params.t}, function(errFind, donor){
                    if(errFind){
                        console.log("Error with Mongo: ", errFind);
                        return res.status(500).send('No se pudo confirmar la desuscripción');
                    }
                    if(!donor){
                        console.log("Donor doesnt exists with unsuscribe token: ", req.params.t);
                        return res.status(403).send('No se pudo terminar la desuscripción');
                    }
                    donor.mails = [];
                    donor.save(function(errSave){
                        if(errSave){
                            console.log("Error with Mongo: ", errSave);
                            return res.status(500).send('Error finalizando la desuscripción');
                        }
                        return res.jsonp({status: "ok"});
                    });
                });
            }
        });
    }
};
