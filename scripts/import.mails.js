var models = require('../db/schemas.js'),
	fs = require('fs'),
	fastCsv = require('fast-csv');

var donationsKeys = [
  '1ª Donac',
  '2ª Donac',
  '3ª Donac',
  '4ª Donac',
  '5ª Donac',
  '6ª Donac',
  '7ª Donac',
  '8ª Donac',
  '9ª Donac',
  '10ª Donac',
  '11ª Don',
  '12ª Don',
  '13ª Don',
  '14ª Don',
  '15ª Don',
  '16ª Don',
  '17ª Don',
  '18ª Don',
  '19ª Don',
  '20ª Don'
]

var good = 0;
var bad = 0;

models.init(false, function(models){


    var cant = 0;
    var fileStream = fs.createReadStream("donantes.nuevo.csv"),
    parser = fastCsv({headers: true});

    fileStream
        .on("readable", function () {
            var data;
            while ((data = fileStream.read()) !== null) {
                parser.write(data);
            }
        })
        .on("end", function () {
            parser.end();
        });

    parser
        .on("readable", function () {
            var data;
            while ((data = parser.read()) !== null) {
    			cant++;
    			if(!data["Doc"]){
                    //console.log("Donante sin Id");
    			}
    			else {
                    if(data["Doc"] != "16127044"){
                        continue;
                    }
                    console.log(data["Doc"])
                    var donante = {};
                    if(!data["Nombre y Apellido"]){
                        donante.name = "Sin Nombre";
                    }
                    else{
                        donante.name = data["Nombre y Apellido"].replace("(TE)", "").trim();
                    }
                    var idReg = new RegExp("^[a-zA-Z]+");
                    var testId = idReg.test(data["Doc"]);
                    if(testId){
                        if(data["Doc"].indexOf("PA") > -1){
                            donante.idType = "Pasaporte";
                        }
                        else{
                            donante.idType = "CI";
                        }
                    }
                    else{
                        donante.idType = "DNI";
                    }
                    donante.idValue = data["Doc"].trim();

    				var tel = data["TE"].replace(/ /g,"").replace(/\-/g,"");
    				if(tel.indexOf("/") > -1){
    					donante.phones = tel.split("/");
    				}
    				else {
    					donante.phones = [tel];
    				}

    				var mail = data["e-mail"].replace(/ /g,"").toLowerCase();
    				if(mail && mail.indexOf("@") == -1){
    					mail = mail.replace("hotmail", "@hotmail").replace("yahoo", "@yahoo").replace("gmail", "@gmail").trim();
    				}

    				if(mail.indexOf("@") > -1){
    					donante.mails = [mail];
                        console.log("mail: ", mail, " | donante.mail: ", donante.mails);
                        good++;
                    }
                    else{
                        bad++;
                    }
                    if(data["F de Nacimiento"]){
                        var _date = data["F de Nacimiento"].trim();
                        if(_date.indexOf("/") > -1){
                            if(_date.indexOf("/") == _date.lastIndexOf("/")){
                                var splittedDate = _date.split("");
                                splittedDate.splice(splittedDate.indexOf("/")+3, 0, "/");
                                _date = splittedDate.join("");
                            }
                            var birthdayMonth = Number(_date.substring(0, _date.indexOf("/")))-1;
                            var birthdayDay = _date.substring(_date.indexOf("/")+1, _date.lastIndexOf("/"));
                            var birthdayYear = _date.substring(_date.lastIndexOf("/")+1, _date.lastIndexOf("/")+5);
                            var birthDate = new Date(birthdayYear, birthdayMonth, birthdayDay, "03");
                            if(isNaN(birthDate.getTime())){
                                birthDate = undefined;
                                //, donationYear, donationMonth, donationDay, lastDonationDate);
                                bad++;
                            }
                            else{
                                good++;
                                donante.birthday = birthDate;
                            }
                        }
                    }


                    donante.comments = "Importado de Excel."
                    var lastDonationDate;
                    for(var i = donationsKeys.length-1; i >= 0; i--){
                        if(data[donationsKeys[i]]){
                            var _date = data[donationsKeys[i]].replace(/v/i,"").trim();
                            if(_date.indexOf("/") == -1) continue;
                            if(_date.indexOf("/") == _date.lastIndexOf("/")){
                                var splittedDate = _date.split("");
                                splittedDate.splice(splittedDate.indexOf("/")+3, 0, "/");
                                _date = splittedDate.join("");
                            }
                            var donationDay =_date.substring(0, _date.indexOf("/"));
                            var donationMonth = Number(_date.substring(_date.indexOf("/")+1, _date.lastIndexOf("/")))-1;
                            var donationYear = _date.substring(_date.lastIndexOf("/")+1, _date.lastIndexOf("/")+3);
                            if(donationYear == "20"){
                                donationYear = _date.substring(_date.lastIndexOf("/")+1, _date.lastIndexOf("/")+5)
                            }
                            donationYear = (donationYear.indexOf("20") === 0 ? donationYear : "20" + donationYear);
                            var lastDonationDate = new Date(donationYear, donationMonth, donationDay, "03");
                            if(isNaN(lastDonationDate.getTime())){
                                lastDonationDate = undefined;
                                //, donationYear, donationMonth, donationDay, lastDonationDate);
                            }
                            break;
                        }
                    }
                    if(lastDonationDate && lastDonationDate.getFullYear() < 2000){
                        console.log(donante.name);
                        process.exit();
                    }
                    donante.lastDonation = lastDonationDate;
                    console.log(donante);
                    var donor = new models.donors(donante);
                    console.log(donor.toObject())
                    continue;
                    /*donor.save(function(errSave){
                        if(errSave){
                            if(errSave.toJSON().code != 11000){
                                process.exit();
                            }
                            else{
                                console.log("Duplicado ", donor.toObject().name, donor.toObject().idValue);
                            }
                        }
                    });*/
    			}
            }
        })
        .on("end", function () {
            console.log("done");
            console.log("GOOD: ", good, "BAD: ", bad);
        });


    /*var item = req.body;
    var id = obj._id;
    delete obj._id;
    if (id) {
        Model.update({_id: id}, obj, {upsert: true}, function (err) {...});
    }
    */
});
