var moment = require('moment');

module.exports = {
	init: function(app, models){

		app.post('/donation', function (req, res, next) {

			if(!req.body.donor || !req.body.donationDate){
				return res.status(400).send('Incomplete item');
			}

			var item = JSON.parse(JSON.stringify(req.body));

			var _donation = new models.donations(item);

			_donation.save(function(errSave){
				if(errSave){
					console.log("Error guardado en tingodb");
					console.log(err);
					res.status(500).send('No se pudo guardar la donacion');
				}

				updateDonorLastDonation(item.donor, item.donationDate, function(){
					return res.jsonp(_donation.toObject());
				});
			});

		});

		app.put('/donation', function (req, res, next) {

			if(!req.body._id){
				return res.status(400).send('Incomplete item');
			}

			var item = JSON.parse(JSON.stringify(req.body));

			item.modificatedAt = new Date();

			models.donations.findOneAndUpdate({_id: item._id},item, function(err, doc){
				if(err){
					console.log("Error update en tingodb");
					console.log(err);
					return res.status(500).send('No se pudo actualizar la informacion de la donacion');
				}
				else{
					console.log("Document updated!")
				}

				rebuildDonorLastDonation(item.donor, function(){
					return res.jsonp(doc.toObject());
				});
			});

		});

		app.delete('/donation', function (req, res, next) {

			if(!req.body._id){
				return res.status(400).send('No se puede eliminar la donacion sin identificar');
			}

			models.donations.remove({_id: req.body._id}, function(err, doc){
				if(err){
					console.log("Error borrando en tingodb");
					console.log(err);
					return res.status(500).send('No se pudo eliminar la donacion');
				}

				rebuildDonorLastDonation(req.body.donor, function(){
					return res.jsonp(req.body);
				});
			});

		});

		app.get('/donation/:id', function(req, res){
			if(!req.params.id){
				return res.status(400).send('No se encontro al donante');
			}

			models.donations
				.findOne({_id: req.params.id})
				.populate('donor')
				.exec(function(err, doc){
					if(err){
						console.log("Error buscando en tingodb");
						console.log(err);
						return res.status(500).send('No se encontro la donacion');
					}
					return res.jsonp(doc.toObject());
				});
		});

		app.get('/donations/search', function(req, res){

			console.log(req.query);
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
			console.log("q",q, "options",options)

			var execQuery = function(total){
				models.donations
					.find(q, {}, options)
					.populate('donor')
					.exec(function(err, docs){
						if(err){
							console.log("Error buscando: ", err);
							return res.status(500).send(err);
						}
						console.log("docs",docs.length);
						var response = {items: docs};
						if(total){
							response.total = total;
						}
						return res.jsonp(response);
					});
			};

			if(getTotal){
				models.donations.count(q, function(errCount, count){
					console.log("errCount", errCount, "count", count);
					execQuery(count);
				});
			}
			else{
				execQuery();
			}

		})

		var updateDonorLastDonation = function(id, donationDate, cb){
			models.donors.findOne({_id: id}, function(errFindOne, _donor){
				if(errFindOne){
					console.log("No se pudo actualizar la fecha de ultima donacion del donante: " + item.donor);
					return cb();
				}
				var d = _donor.toObject();
				if(!d.lastDonation || moment(d.lastDonation).unix() < moment(donationDate).unix()){
					_donor.set("lastDonation", donationDate);
					_donor.save(function(errSave){
						if(errSave){
							console.log("No se pudo actualizar la fecha de ultima donacion del donante: " + item.donor);
						}
						return cb();
					});
				}
				else{
					return cb();
				}
			});
		};

		var rebuildDonorLastDonation = function(id, cb){
			var q = {
				donor: {
					_id: id
				}
			};

			models.donations.find(q, function(err, results){
				if(err){
					console.log("No se pudo actualizar la informacion de ultima donacion del donante " + id);
					console.log(err);
					return cb();
				}
				if(results && results.length > 0){
					//Minimo valor unix timestamp
					var newLastDonationDate = 0;
					results.forEach(function(elem){
						var e = elem.toObject();
						if(moment(e.donationDate).unix() > newLastDonationDate){
							newLastDonationDate = moment(e.donationDate).unix();
						}
					});
					if(newLastDonationDate > 0){
						models.donors.update({_id: id}, {lastDonation: (new Date(newLastDonationDate*1000))}, function(errUpdate){
							if(errUpdate){
								console.log("No se pudo actualizar la informacion de ultima donacion del donante " + id);
								console.log(errUpdate);
							}
							return cb();
						});
					}
					else{
						return cb();
					}
				}
				else{
					models.donors.findOne({_id: id}, function(errFindOne, _donor){
						if(errFindOne){
							console.log("No se pudo actualizar la informacion de ultima donacion del donante " + id);
							console.log(errFindOne);
							return cb();
						}
						_donor.lastDonation = undefined;
						_donor.save(function(errSave){
							if(errSave){
								console.log("No se pudo actualizar la fecha de ultima donacion del donante: " + id);
							}
							return cb();
						});
					});
				}
			});
		};

	}
}
