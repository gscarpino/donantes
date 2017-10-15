var shortId = require('shortid');

var usersSchemaOptions = {
	_id: {type: String, default: shortId.generate},
	username: {type: String, unique: true, index: true, required: true},
	password: {type: String, unique: true, index: true, required: true},
	token: {type: String, index: true},
	lastLogin: Date,
	lastAction: Date,
	status: {type: Number, default: 201}
};


var donorSchemaOptions = {
	_id: {type: String, default: shortId.generate},
    name: String,
	idType: String,
	idValue: {type: String, index: {unique: true}},
	phones: {type: [String], default: []},
	mails: {type: [String], default: [], index: true},
	createdAt: {type: Date, default: (new Date())},
	modificatedAt: {type: Date, default: (new Date())},
	birthday: Date,
	comments: String,
	gender: String,
	bloodType: String,
	lastDonation: Date,
	unsuscribeToken: {type: String, index: true},
	status: {type: Number, default: 201}
};


var donationsSchemaOptions = {
	_id: {type: String, default: shortId.generate},
	donor: {type: String, ref: 'donors'},
	donationDate: {type: Date, index: true},
	donationPlace: String,
	donationType: String,
	donorType: String,
	rejected: {type: Boolean, default: false},
	modificatedAt: {type: Date, default: (new Date())},
	createdAt: {type: Date, default: (new Date())},
	comments: String,
	negativeSerology: {type: Boolean, default: true}
};

var mailSchemaOptions = {
	_id: {type: String, default: shortId.generate},
	subject: {type: String, required: true},
	body: {type: String, required: true},
	to: {type: Array, required: true},
	desireDate: {type: Date, default: new Date(), index: true}
};

var mongoose,
	Schema;

var mongooseConnected = function(mongooseInstance, mongooseSchema, callback){
	var usersSchema = mongooseSchema(usersSchemaOptions);
	var donorSchema = mongooseSchema(donorSchemaOptions);
	var donationsSchema = mongooseSchema(donationsSchemaOptions);
	var mailSchema = mongooseSchema(mailSchemaOptions);
	donorSchema.index({lastDonation: -1});
	callback({
		users: mongooseInstance.model('users', usersSchema),
		donors: mongooseInstance.model('donors', donorSchema),
		donorsTest: mongooseInstance.model('donorsTest', donorSchema),
		donations: mongooseInstance.model('donations', donationsSchema),
		mails: mongooseInstance.model('mails', mailSchema)
	})
}

module.exports = {
	init: function(local, cb){
		if(local == "true"){
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
