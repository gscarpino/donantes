module.exports = {
	init: function(app, models){

		app.put('/donor/status', function(req, res){
			console.log("req.body", req.body);
			if(!req.body.idType || !req.body.idValue || !req.body.action){
				return res.status(400).send('Incomplete item');
			}
			models.donors.findOne({idType: req.body.idType, idValue: req.body.idValue, services: req.user.service}, function(err, doc){
				if(err){
					console.log("Error busqueda en la base de datos");
					console.log(err);
					return res.status(500).send('No se pudo buscar ni crear el donante');
				}
				if(!doc){
					return res.status(404).send('No se encuentra al donante');
				}
				doc.set("status", req.body.action == 'archive' ? 423 : 201 );
				doc.save(function(errSave){
					if(errSave){
						console.log("Error guardando en la base de datos");
						console.log(errSave);
						return res.status(500).send('No se pudo guardar en la base de datos');
					}
					return res.jsonp({status: "ok"});
				});
			});
		});

		app.post('/donor', function (req, res) {

			if(!req.body.idType || !req.body.idValue || !req.body.name){
				return res.status(400).send('Incomplete item');
			}

			var item = JSON.parse(JSON.stringify(req.body));

			models.donors.findOne({idType: item.idType, idValue: item.idValue, services: req.user.service}, function(err, doc){
				if(err){
					console.log("Error busqueda en la base de datos");
					console.log(err);
					return res.status(500).send('No se pudo buscar ni crear el donante');
				}
				if(doc){
					return res.status(403).send('El donante ya existe');
				}
				else{

					var d = new models.donors(item);
					if(req.user){
						d.services = [req.user.service];
					}
					d.save(function(errSave){
						if(errSave){
							console.log("Error guardado en la base de datos");
							console.log(err);
							return res.status(500).send('No se pudo guardar el donante');
						}
						return res.jsonp(d.toObject());
					});
				}

			});

		});

		app.put('/donor', function (req, res) {

			if(!req.body._id){
				return res.status(400).send('Incomplete item');
			}
			var item = JSON.parse(JSON.stringify(req.body));
			item.modificatedAt = new Date();

			models.donors.findOneAndUpdate({_id: item._id, services: req.user.service},item, function(err, doc){
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

		app.delete('/donor/:id', function (req, res) {

			if(!req.params.id){
				return res.status(400).send('No se puede eliminar donante sin identificar');
			}

			models.donors.remove({_id: req.params.id, services: req.user.service}, function(err, doc){
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

			models.donors
				.findOne({_id: req.params.id, services: req.user.service})
				.populate('services')
				.exec(function(err, doc){
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
			var q = {};
			if(!req.query.q){
				if(req.query.reg){
					var temp = JSON.parse(req.query.reg);
					for(var k in temp){
						if (temp.hasOwnProperty(k)) {
							switch(k){
								case "skip":
								case "limit":
								case "sort":
									q[k] = temp[k];
									continue;
							}
							//TODO: hacerlo case insensitive
							q[k] = new RegExp(temp[k], "i");
						}
						console.log("qqq",q)
					}
				}
			}
			else{
				q = JSON.parse(req.query.q);
			}

			var options = {};
			options.limit = q.size ? Number(q.size) : (req.query.size ? Number(req.query.size) : 50);
			options.skip = q.skip ? Number(q.skip) : (req.query.skip ? Number(req.query.skip) : 0);

			var sort = q.sort ? q.sort : (req.query.sort ? req.query.sort : null);
			var sorting = {};

			if(sort){
				options.sort = {};
				options.sort[sort] = -1;
			}
			else
				options.sort = {"modificatedAt": -1};

			var getTotal = false;
			if(!q.skip && !req.query.skip){
				getTotal = true;
			}
			delete q.skip;
			delete q.size;
			delete q.sort;

			q.services = req.user.service;
			var execQuery = function(total){
				models.donors
					.find(q, {}, options)
					.populate('services')
					.exec(function(err, docs){
						if(err){
							console.log("Error buscando: ", err);
							return res.status(500).send(err);
						}
						var response = {items: docs};
						if(total){
							response.total = total;
						}
						return res.jsonp(response);
					});
			};

			if(getTotal){
				models.donors.count(q, function(errCount, count){
					execQuery(count);
				});
			}
			else{
				execQuery();
			}
		});
	}
}
