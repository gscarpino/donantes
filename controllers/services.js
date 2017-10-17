module.exports = {
    init: function(app, models){

        app.get('/services/', function(req, res){
            models.services.find({}, function(errFind, services){
                if(errFind){
                    console.log("Error buscando en la base de datos");
                    console.log(errSave);
                    return res.status(500).send('No se pudo buscar servicios');
                }
                return res.jsonp(services);
            })
        });

        app.post('/services/', function(req, res){
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
                return res.jsonp({status: "ok"});
            });
        });
    }
};
