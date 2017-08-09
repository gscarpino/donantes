var shortId = require('shortid');


var donorSchemaOptions = {
	_id: {type: String, default: shortId.generate},
    name: String,
	idType: String,
	idValue: {type: String, index: {unique: true}},
	phones: {type: [String], default: []},
	mails: {type: [String], default: []},
	createdAt: {type: Date, default: (new Date())},
	modificatedAt: {type: Date, default: (new Date())},
	birthday: Date,
	comments: String,
	gender: String,
	bloodType: String,
	lastDonation: Date,
	status: {type: Number, default: 201}
};


var donationsSchemaOptions = {
	_id: {type: String, default: shortId.generate},
	donor: {type: String, ref: 'donors'},
	donationDate: Date,
	donationPlace: String,
	donationType: String,
	donorType: String,
	rejected: {type: Boolean, default: false},
	modificatedAt:{type: Date, default: (new Date())},
	createdAt: {type: Date, default: (new Date())},
	comments: String
};

var mongoose,
	Schema;

var mongooseConnected = function(m, s, c){
	var donorSchema = s(donorSchemaOptions);
	var donationsSchema = s(donationsSchemaOptions);
	donorSchema.index({lastDonation: -1});
	c({
		donors: m.model('donors', donorSchema),
		donorsTest: m.model('donorsTest', donorSchema),
		donations: m.model('donations', donationsSchema)
	})
}

module.exports = {
	init: function(local, cb){
		if(args.local == "true"){
			var tungus = require('tungus');
			mongoose = require('../node_modules/tingodb/node_modules/mongoose');
			Schema = mongoose.Schema;

			global.TUNGUS_DB_OPTIONS =  { nativeObjectID: true, searchInArray: true };

			mongoose.connect(
				'tingodb://db',
				function (err) {
			        if(err){
			            console.log("Error conectando:", err);
			            process.exit(1);
			        }
			        console.log("Connected to TingoDB!")
			        mongooseConnected(mongoose, Schema, cb);
				}
			);
		}
		else{
			mongoose = require('mongoose'),
			Schema = mongoose.Schema;

			mongoose.connect(
				'mongodb://donantes:gigoju16@127.0.0.1:27017/donantes',
				{
					useMongoClient: true
				},
				function(err){
					if(err){
			            console.log("Error conectando:", err);
			            process.exit(1);
			        }
				    mongooseConnected(mongoose, Schema, cb);
				}
			);
		}
	}
}
