var fs = require('fs'),
    config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8')),
    request = require('request'),
    jwt = require('jsonwebtoken'),
    crypto = require('crypto'),
    hooks = require('hook_manager').init(config);

var list = {
    exchanges: ['MAILER'],
    routingKey: "donantes.mail.send",
    event: "send"
}

module.exports = {
    init: function(app, models){

        var saveUser = function(user, callback) {
            user.save(function(errSaveUser){
                if(errSaveUser){
                    return callback(errSaveUser);
                }
                var mailBody = "Estimado donante voluntario de sangre, <br>" +
                    " Para confirmar el registro, necesitamos que acceda al siguiente link: <br><br>" +
                    "<a href='https://donantesvoluntariosdesangre.com.ar/#/confirm/" + user.registrationToken + "' target='_blank'>Confirmar registro</a><br><br>" +
                    "Desde ya, muchas gracias!";
                hooks.invoke(list, {to: [user.username], body: mailBody, subject: "Confirmacion donante voluntario"}, function(){
                    callback();
                })
            })
        };

        app.post('/user', function(req, res){

            if(!req.body.user || !req.body.user.service || !req.body.user.mail || !req.body.user.idType || !req.body.user.idValue || !req.body.response){
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
                if(body.success) {
                    models.users.findOne({username: req.body.user.mail}, function(errFindUser, user){
                        if(errFindUser){
                            console.log("Error buscando usuario", errFindUser)
                            return res.status(500).send('No se pudo buscar usuario');
                        }
                        if(user){
                            if(user.status == 423) {
                                console.log("Ya existe el usuario, falta confirmacion");
                                return res.status(423).send("Ya existe un usuario con ese email, falta confirmacion");
                            }
                            else if(user.status == 200) {
                                console.log("Ya existe el usuario");
                                return res.status(200).send("Ya existe un usuario con ese email");
                            }
                            else {
                                console.log("Ya existe el usuario, error con el status", user)
                                return res.status(500).send('Ya existe el usuario, error con los datos');
                            }
                        }
                        models.donors.findOne({idType: req.body.user.idType, idValue: req.body.user.idValue}, function(errFindDonors, donor){
                            if(errFindDonors){
                                console.log("Error buscando donante", errFindDonors)
                                return res.status(500).send('No se pudo buscar donante');
                            }
                            var ts = new Date().getTime();
                            user = new models.users();
                            user.username = req.body.user.mail;
                            user.registrationToken = jwt.sign({idValue: req.body.user.idValue, mail: req.body.user.mail, ts: ts}, ts.toString());
                            user.registrationDate = new Date(),
                            user.role = 'user';
                            user.service = req.body.user.service._id;
                            if(donor) {
                                donor.user = user._id;
                                user.donor = donor._id;
                                if(donor.services.indexOf(req.body.user.service._id) == -1){
                                    donor.services.push(req.body.user.service._id);
                                }
                                donor.save(function(errSaveDonor){
                                    saveUser(user, function(errSaveUser){
                                        if(errSaveUser){
                                            console.log("Error creando usuario", errSaveUser);
                                            return res.status(500).send('No se pudo crear el usuario');
                                        }
                                        return res.status(201).send("Usuario creado, falta confirmacion");
                                    });
                                });
                            }
                            else {
                                donor = new models.donors();
                                donor.name = req.body.user.name;
                                donor.idType = req.body.user.idType;
                                donor.idValue = req.body.user.idValue;
                                donor.mails = [req.body.user.mail];
                                donor.services = [req.body.user.service._id];
                                donor.phones = req.body.user.phone ? [req.body.user.phone] : [];
                                donor.status = 423;
                                //TODO: check not today or valid birthday
                                if(req.body.user.birthday){
                                    donor.birthday = req.body.user.birthday;
                                }
                                if(req.body.user.gender){
                                    donor.gender = req.body.user.gender;
                                }
                                if(req.body.user.bloodType){
                                    donor.bloodType = req.body.user.bloodType;
                                }
                                donor.user = user._id;
                                user.donor = donor._id;
                                donor.save(function(errSaveDonor){
                                    saveUser(user, function(errSaveUser){
                                        if(errSaveUser){
                                            console.log("Error creando usuario", errSaveUser);
                                            return res.status(500).send('No se pudo crear el usuario');
                                        }
                                        return res.status(201).send("Usuario creado, falta confirmacion");
                                    });
                                });
                            }
                        });
                    });
                }
                else {
                    return res.status(401).send('Not authorized');
                }
            });
        });

        app.post('/confirm/:token', function(req, res){
            console.log("req.body", req.body);
            //Send mail to service about new volunteer donor

            if(!req.params.token || !req.body.user || !req.body.user.password || !req.body.response){
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
                if(body.success) {
                    models.users.findOne({registrationToken: req.params.token})
                        .populate('service')
                        .exec(function(errFindUser, user){
                            if(errFindUser){
                                console.log("Error con buscando en la base de datos", errFindUser);
                                return res.status(500).send('No se pudo confirmar el usuario, intente mas tarde');
                            }
                            if(!user){
                                console.log("Error con token:", req.params.token);
                                return res.status(500).send('No se pudo confirmar el usuario, token invalido');
                            }
                            var hash = crypto.createHash('DSA-SHA1');
                            hash.update(req.body.user.password)
                            var pass = hash.digest('hex');
                            user.password = pass;
                            delete user.registrationToken;
                            user.status = 200;
                            user.save(function(errSaveUser){
                                if(errSaveUser){
                                    console.log("Error guardando usuario en la base de datos", errSaveUser);
                                    return res.status(500).send('Usuario confirmado pero donante no habilitado');
                                }
                                models.donors.findById(user.donor, function(errFindDonor, donor){
                                    if(errFindDonor){
                                        console.log("Error con buscando donante en la base de datos", errFindDonor);
                                        return res.status(500).send('Usuario confirmado pero donante no habilitado');
                                    }
                                    if(!donor){
                                        console.log("Error con usuario y donante:", user._id, user.donor);
                                        return res.status(500).send('No se pudo confirmar el usuario, token invalido');
                                    }
                                    donor.status = 201;
                                    donor.save(function(errSaveDonor){
                                        if(errSaveDonor){
                                            console.log("Error guardando donante en la base de datos", errSaveDonor);
                                            return res.status(500).send('Usuario confirmado pero donante no habilitado');
                                        }
                                        if(user.service.mail){
                                            var mailBody = user.service.name + ", <br>" +
                                                "Se ha confirmado el siguiente donante de sangre: <br><br>" +
                                                donor.name.toUpperCase() + " | " + donor.idType + " " + donor.idValue + "<br><br>" +
                                                "Desde ya, muchas gracias!";
                                            hooks.invoke(list, {to: [user.service.mail], body: mailBody, subject: "Confirmacion de donante voluntario"}, function(){
                                                return res.status(201).send("Usuario confirmado");
                                            })
                                        }
                                        else {
                                            return res.status(201).send("Usuario confirmado");
                                        }
                                    });
                                });
                            });
                        });
                }
                else {
                    return res.status(401).send('Not authorized');
                }
            });
        });
    }
}
