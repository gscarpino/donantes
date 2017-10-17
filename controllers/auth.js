var jwt = require('jsonwebtoken'),
    crypto = require('crypto');

module.exports = {
    init: function(app, models){

        var exceptions = ["\\B\\/unsuscribed\\/.*"];

        app.use(function(req, res, next){
            //TODO: cambiar a regular expresion por los parametros:

            switch(req.url){
                case "/":
                case "/login/":
                case "/unsuscribe/":
                    return next();
                    break;
                default:
                    var found = false;
                    exceptions.forEach(function(endPointExpression){
                        var r = new RegExp(endPointExpression);
                        found = found || r.test(req.url);
                    });
                    if(found) return next();
                    if(req.headers.authorization){
                        var t = req.headers.authorization.split(" ");
                        if(t[0] != "Basic"){
                            return res.status(401).send('Unathorized!');
                        }
                        models.users.findOne({token: t[1]}, function(errFind, user){
                            if(user){
                                req.token = t[1];
                                req.user = user;
                                if(req.url == "/auth/"){
                                    return next();
                                }
                                user.lastAction = new Date();
                                user.save(function(errSave){
                                    if(errSave){
                                        console.log("Error con Mongo", errSave);
                                    }
                                    return next();
                                });
                            }
                            else{
                                return res.status(401).send('Unathorized!');
                            }
                        })
                    }
                    else{
                        return res.status(401).send('Unathorized!');
                    }
                    break;
            }
        });

        app.post('/auth', function (req, res) {
            if(!req.token){
                return res.status(401).send('Unathorized!');
            }
            models.users.findOne({token: req.token}, function(errFind, user){
                if(errFind){
                    console.log("Error con Mongo", errFind);
                    return res.status(500).send('Error con la base de datos');
                }
                if(!user){
                    return res.status(401).send('No se pudo iniciar sesión');
                }
                if(new Date().getTime() - user.lastAction.getTime() > 1000*60*60*24){
                    console.log("Sesión vencida");
                    return res.status(401).send('Sesión vencida');
                }
                else{
                    return res.jsonp({status: "OK"});
                }
            })
        });

        app.post('/login', function (req, res) {
            if(!req.body.u || !req.body.p){
                return res.status(400).send('Urls malformed');
            }
            var user = req.body.u;

            var hash = crypto.createHash('DSA-SHA1');
            hash.update(req.body.p)
            var pass = hash.digest('hex');
            models.users
                .findOne({username: user, password: pass})
                .populate('service')
                .exec(function(errFind, user){
                    if(errFind){
                        console.log("Error con Mongo", errFind);
                        return res.status(500).send('Error con la base de datos');
                    }
                    if(!user){
                        return res.status(401).send('No se pudo iniciar sesión');
                    }

                    var ts = new Date().getTime()
                    var token = jwt.sign({user: req.body.u, pass: req.body.password, ts: ts}, ts.toString());

                    user.lastLogin = new Date();
                    user.lastAction = new Date();
                    user.token = token;
                    user.save(function(errSave){
                        if(errSave){
                            console.log("Error con Mongo", errSave);
                            return res.status(500).send('Error guardando en la base de datos');
                        }
                        return res.jsonp({status: "OK", t: token, service: user.toObject().service});
                    });
                });
        });


        app.post('/logout', function (req, res) {
            models.users
                .findOne({token: req.token})
                .exec(function(errFind, user){
                    if(errFind){
                        console.log("Error con Mongo", errFind);
                        return res.status(500).send('Error con la base de datos');
                    }
                    if(!user){
                        return res.status(401).send('No se pudo cerrar sesión');
                    }
                    user.token = "";
                    user.save(function(errSave){
                        if(errSave){
                            console.log("Error con Mongo", errSave);
                            return res.status(500).send('Error guardando en la base de datos');
                        }
                        return res.jsonp({status: "OK"});
                    });
                });
        });
    }
}
