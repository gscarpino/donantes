var fs = require('fs'),
    config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8')),
    hooks = require('hook_manager').init(config);

var listPurge = {
    exchanges: ['PURGE'],
    routingKey: "donantes.purge",
    event: "send"
}
module.exports = {
    init: function(app, models){

        app.get('/services/names', function(req, res){
            models.services.find({status: 201}, {name: 1}, function(errFind, services){
                if(errFind){
                    console.log("Error buscando en la base de datos");
                    console.log(errSave);
                    return res.status(500).send('No se pudo buscar servicios');
                }
                return res.jsonp(services);
            });
        });

        app.get('/services/:id?', function(req, res){
            if(req.params.id){
                models.services.findById(req.params.id, function(errFind, doc){
                    if(errFind){
                        console.log("Error buscando en la base de datos");
                        console.log(errSave);
                        return res.status(500).send('No se pudo buscar servicios');
                    }
                    if(doc)
                        return res.jsonp(doc.toObject());
                    else
                        return res.status(404).send('No se encontro el servicio');
                });
            }
            else{
                models.services.find({status: 201}, function(errFind, services){
                    if(errFind){
                        console.log("Error buscando en la base de datos");
                        console.log(errSave);
                        return res.status(500).send('No se pudo buscar servicios');
                    }
                    return res.jsonp(services);
                });
            }
        });

        app.post('/service/', function(req, res){
            if(!req.body.name){
                return res.status(400).send('Incomplete item');
            }
            var aNewService = new models.services(req.body);
            aNewService.save(function(errSave){
                if(errSave){
                    console.log("Error guardado en la base de datos");
                    console.log(errSave);
                    return res.status(500).send('No se pudo guardar el servicio');
                }
                hooks.invoke(listPurge, {url: "/services/names"}, function(){
                    return res.jsonp(aNewService.toObject());
                });
            });
        });

        app.put('/service/', function(req, res){
            if(!req.body._id){
                return res.status(400).send('Incomplete item');
            }
            var item = JSON.parse(JSON.stringify(req.body));
            item.modificatedAt = new Date();

            models.services.findOneAndUpdate({_id: item._id} ,item, function(err, doc){
                if(err){
                    console.log("Error update en la base de datos");
                    console.log(err);
                    return res.status(500).send('No se pudo actualizar la informacion del servicio');
                }
                else{
                    console.log("Document updated!")
                }
                hooks.invoke(listPurge, {url: "/services/names"}, function(){
                    return res.jsonp(doc.toObject());
                });
            });
        });

        app.delete('/service/:id', function(req, res){
            if(!req.params.id){
                return res.status(400).send('Incomplete item');
            }

            models.services.findOneAndUpdate({_id: req.params.id}, {$set: {status: 423}}, function(errDelete){
                if(errDelete){
                    console.log("Error actualizando documento en la base de datos");
                    console.log(errDelete);
                    return res.status(500).send('No se pudo borrar el servicio');
                }
                //TODO: enviar mail a donantes del servicio avisando
                return res.jsonp({status: "ok"});
            });
        });
    }
};
