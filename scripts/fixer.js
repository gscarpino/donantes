var models = require('../db/schemas.js'),
	fs = require('fs'),
	fastCsv = require('fast-csv');

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

    parser.validate(function(data, next){
        if(!data["Doc"]){
            return next(null, false);
        }
        fix(data, next)
    });

    parser.on("data", function(data){

    });
    var updated = 0;
    var fix = function(data, callback){
        var donante = {};

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


        var mail = data["e-mail"].replace(/ /g,"").toLowerCase();
        if(mail && mail.indexOf("@") == -1){
            mail = mail.replace("hotmail", "@hotmail").replace("yahoo", "@yahoo").replace("gmail", "@gmail").trim();
        }

        if(mail.indexOf("@") > -1){
            donante.mails = [mail];
        }
        else{
            return callback(null, true);
        }

        //console.log("donante.idType", donante.idType, "donante.idValue", donante.idValue)
        models.donors.findOne({idType: donante.idType, idValue: donante.idValue}, function(errFind, donor){
            if(donor){
                if(donor.mails.length > 0){
                    for(var donanteMail = 0; donanteMail < donante.mails.length; donanteMail++){
                        var mustAdd = true;
                        for(var donorMail = 0; donorMail < donor.mails.length; donorMail++){
                            if(donor.mails[donorMail] == donante.mails[donanteMail]){
                                mustAdd = false;
                            }
                        }
                        if(mustAdd){
                            donor.mails.push(donante.mails[donanteMail]);
                        }
                    }
                }
                else{
                    donor.mails = donante.mails;
                }
                console.log(donor._id,donor.mails);
                donor.save(function(errSave){
                    if(errSave){
                        console.log("Error guardando en Mongo", donor.toObject());
                        process.exit();
                    }
                    updated++;
                    console.log("Updated ", updated);
                    callback(errSave, true);
                });
            }
            else{
                callback(null, true);
            }
        });
    };

    /*parser
        .on("readable", function () {

            var data;
            data = parser.read();
            var parseador = function(){
    			cant++;
                if(!data["Doc"]){
                    console.log("Donante sin Id");
                    data = parser.read();
                    if(data !== null) {
                        parseador();
                    }
                    return;
    			}
    			else {
                        console.log(data["Doc"]);
                        process.exit();
                    if(data["Doc"] != "16127044"){
                        data = parser.read();
                        if(data !== null) {
                            parseador();
                        }
                        return;
                    }
                    else{
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

                        console.log("donante.idType", donante.idType, "donante.idValue", donante.idValue)
                        models.donors.findOne({idType: donante.idType, idValue: donante.idType}, function(errFind, donor){
                            console.log(errFind);
                            if(donor){

                            console.log(errFind, donor.toObject());
                            }
                            data = parser.read();
                            if(data !== null){
                                parseador();
                            }
                            /*
                            if(donor.mails.length > 0){
                                for(var donanteMail = 0; donanteMail < donante.mails.length; donanteMail++){
                                    var mustAdd = true;
                                    for(var donorMail = 0; donorMail < donor.mails.length; donorMail++){
                                        if(donor.mails[donorMail] == donante.mails[donanteMail]){
                                            mustAdd = false;
                                        }
                                    }
                                    if(mustAdd){
                                        donor.mails.push(donante.mails[donanteMail]);
                                    }
                                }
                            }
                            console.log(errFind, donor.toObject());*/
        /*                });
                    }
    			}
            };

            if(data !== null) {
                parseador();
            }
        })
        .on("end", function () {
            console.log("done");
            console.log("GOOD: ", good, "BAD: ", bad);
        });*/
});
