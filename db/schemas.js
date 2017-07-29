var tungus = require('tungus'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	shortId = require('shortid');
	
	
global.TUNGUS_DB_OPTIONS =  { nativeObjectID: true, searchInArray: true };


mongoose.connect('tingodb://db', function (err) {
	if(err){ 
		console.log("Error conectando:", err);
		process.exit(1);
	}
	else{
		console.log("Connected to MongoDB(TingoDB)!");
	}
});

var donorSchema = Schema({
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
});


var donationsSchema = Schema({
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
});

module.exports = {
	donors: mongoose.model('donors', donorSchema),
	donorsTest: mongoose.model('donorsTest', donorSchema),
	donations: mongoose.model('donations', donationsSchema)
}