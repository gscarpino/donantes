var models = require('../db/schemas.js');

module.exports = {
	init: function(app){

		app.post('/donor', function (req, res, next) {

			if(!req.body.idType || !req.body.idValue || !req.body.name){
				return res.status(400).send('Incomplete item');
			}

			var item = JSON.parse(JSON.stringify(req.body));

			models.donors.findOne({idType: item.idType, idValue: item.idValue}, function(err, doc){
				if(err){
					console.log("Error busqueda en la base de datos");
					console.log(err);
					res.status(500).send('No se pudo buscar ni crear el donante');
				}
				if(doc){
					res.status(403).send('El donante ya existe');
				}
				else{

					var d = new models.donors(item);
					d.save(function(errSave){
						if(errSave){
							console.log("Error guardado en la base de datos");
							console.log(err);
							res.status(500).send('No se pudo guardar el donante');
						}
						return res.jsonp(d.toObject());
					});
				}

			});

		});

		app.put('/donor', function (req, res, next) {

			if(!req.body._id){
				return res.status(400).send('Incomplete item');
			}
			var item = JSON.parse(JSON.stringify(req.body));
			item.modificatedAt = new Date();

			models.donors.findOneAndUpdate({_id: item._id},item, function(err, doc){
				if(err){
					console.log("Error update en la base de datos");
					console.log(err);
					return res.status(500).send('No se pudo actualizar la informacion del donante');
				}
				else{
					console.log("Document updated!")
				}

				return res.jsonp(doc.toObject());
			});

		});

		app.delete('/donor/:id', function (req, res, next) {

			if(!req.params.id){
				return res.status(400).send('No se puede eliminar donante sin identificar');
			}

			models.donors.remove({_id: req.params.id}, function(err, doc){
				if(err){
					console.log("Error borrando en la base de datos");
					console.log(err);
					return res.status(500).send('No se pudo eliminar el donante');
				}

				models.donations.remove({donor: {_id: req.params.id}}, function(errDonations){
					if(errDonations){
						console.log("Error, no se pudo borrar las donaciones del donante");
						console.log(errDonations);
						return res.jsonp({status: "OK", warning: "Error, no se pudo borrar las donaciones del donante"});
					}
					else{
						return res.jsonp({status: "OK"});
					}
				})

			});

		});

		app.get('/donor/:id', function(req, res){
			if(!req.params.id){
				return res.status(400).send('No se encontro al donante');
			}

			models.donors.findOne({_id: req.params.id}, function(err, doc){
				if(err){
					console.log("Error borrando en la base de datos");
					console.log(err);
					return res.status(500).send('No se encontro al donante');
				}

				if(doc)
					return res.jsonp(doc.toObject());
				else
					return res.status(404).send('No se encontro al donante');
			});
		});

		app.get('/donors/search', function(req, res){
			console.log(req.query.q);
			var q = {};
			if(!req.query.q){
				if(req.query.reg){
					var temp = JSON.parse(req.query.reg);
					for(var k in temp){
						if (temp.hasOwnProperty(k)) {
							//TODO: hacerlo case insensitive
							q[k] = new RegExp(temp[k]);
						}
					}
				}
			}
			else{
				q = JSON.parse(req.query.q);
			}

			var limit = q.size ? Number(q.size) : 50;
			var skip = q.skip ? Number(q.skip) : 0;

			var sort = q.sort;
			var sorting = {};

			if(sort)
				sorting[sort] = 1;
			else
				sorting["modificatedAt"] = 1;

			delete q.skip;
			delete q.size;
			delete q.sort;
			console.log(q)
			models.donors.find(q, {}, {limit: limit, skip: skip},function(err, docs){
				if(err){
					console.log("Error buscando: ", err);
					return res.status(500).send(err);
				}
				console.log("docs",docs.length);
				return res.jsonp(docs);
			})

		})


	}
}
