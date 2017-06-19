var models = require('../db/schemas.js'),
	fs = require('fs'),
	fastCsv = require('fast-csv');

	var cant = 0;
var fileStream = fs.createReadStream("donantes.csv"),
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
			if(!data["Doc"] || !data["Nombre y Apellido"]){
				//console.log("Revisar", data);
			
			}
			else {				
				var donante = {
					name: data["Nombre y Apellido"].replace("(TE)", ""),
					birthday: data["F de Nacimiento"],
					idValue: data["Doc"]
				}
				
				var tel = data["TE"].replace(/ /g,"");
				if(tel.indexOf("/") > -1){
					donante.phones = tel.split("/");
				}
				else {
					donante.phones = [tel];
				}
				
				var mail = data["e-mail"].replace(/ /g,"");
				if(mail && mail.indexOf("@") == -1){
					console.log(data["e-mail"]);
					mail = mail.toLowerCase().replace("hotmail", "@hotmail").replace("yahoo", "@yahoo").replace("gmail", "@gmail");
				}
				
				if(mail.indexOf("@") > -1){
					donante.mail = [mail];
					
				}
				
            console.log(donante);
			}
        }
    })
    .on("end", function () {
        console.log("done");
    });
 

/*var item = req.body;
var id = obj._id;
delete obj._id;
if (id) {
    Model.update({_id: id}, obj, {upsert: true}, function (err) {...});
}
*/