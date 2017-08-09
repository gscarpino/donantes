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

			if(!req.query.q)
				var q = {};
			else
				var q = JSON.parse(req.query.q);

			var limit = req.query.size ? Number(req.query.size) : 50;
			var skip = req.query.skip ? Number(req.query.skip) : 0;

			var sort = req.query.sort;
			var sorting = {};

			if(sort)
				sorting[sort] = 1;
			else
				sorting["modificatedAt"] = 1;

			models.donations
				.find(q)
				.populate('donor')
				.exec(function(err, docs){
					if(err){
						console.log("Error buscando en tingodb");
						console.log(err);
						return res.status(500).send('No se encontron las donaciones');
					}
					return res.jsonp(docs);
				});

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
