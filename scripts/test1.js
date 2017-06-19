var models = require('../db/schemas.js'),
	async = require('async');

var maxDonors = 1000,
	maxDonations = 10,
	countDonors = 0,
	genders = ['Femenino', 'Masculino'],
	femaleRate = 51,
	maxDonorAge = 65
	minDonorAge = 18
	bloodTypes = [
		'a-plus',
		'a-minus', 
		'b-plus', 
		'b-minus', 
		'ab-plus', 
		'ab-minus', 
		'0-plus', 
		'0-minus'
	];
	
/*
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
*/

async.whilst(
    function() { return countDonors < maxDonors; },
    function(callback) {
        countDonors++;
		var d = new models.donors();
		d.name = "Donante " + countDonors;
		d.idType = "DNI",
		d.idValue = countDonors.toString() + countDonors.toString() + countDonors.toString();
		d.phones = [genRandomPhone()];
		d.mails = [genRandomMail(d)];
		d.birthday = genRandomBirthday();
		d.gender = genRandomGender();
		d.bloodType = genRandomBloodType();
		d.lastDonation = genRandomLastDonation(d);
		//callback(null, countDonors);
		d.save(function(errSave){
			if(errSave){
				console.log("Error guardado en tingodb");
				console.log(err);
				callback('No se pudo guardar el donante', countDonors);
			}
			console.log("Donante creado " + countDonors);
			callback(null, countDonors);
		});
    },
    function (err, n) {
        if(err){
			console.log("Error: ", err)
		}
		else{
			console.log("FIN");
		}
    }
);

function genRandomPhone(){
	var numberLength = 8;
	var num = [4];
	for(var i = 1; i < numberLength; i++){
		num.push(Math.floor(Math.random()*10));
	}
	return num.join("");
}

function genRandomMail(donor){
	return donor.name.replace(" ", "_").toLowerCase() + "." + donor.phones[0] + "@domain.com";
}

function genRandomBirthday(){
	var yearNow = (new Date()).getFullYear();
	var year = Math.floor((yearNow - maxDonorAge) + Math.random() * (maxDonorAge - minDonorAge));
	var randomDayMonth = 1 + Math.floor(Math.random() * 365);
	var birthday = (new Date(year, 0)).setDate(randomDayMonth);

	return new Date(birthday);
}

function genRandomGender(){
	return (Math.floor(Math.random()*100) < femaleRate) ? genders[0] : genders[1];
}

function genRandomBloodType(){
	return bloodTypes[Math.floor(Math.random() * 9)];
}

function genRandomLastDonation(donor){
	var yearNow = (new Date()).getFullYear();
	var yearDonor = donor.birthday.getFullYear();
	var year = Math.floor(yearDonor + minDonorAge + Math.random() * (yearNow - yearDonor - minDonorAge));
	if(year <= yearDonor || year > yearNow){
		console.log(yearDonor,year);
		console.log("Auch!")
		process.exit();		
	}
	var randomDayMonth = 1 + Math.floor(Math.random() * 365);
	var donationDate = (new Date(year, 0)).setDate(randomDayMonth);

	return new Date(donationDate);
}