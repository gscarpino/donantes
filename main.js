var server = require('./server.js').init(),
	app = require('./server.js').app,
	childProcess = require('child_process'),
	mailerController = require('./controllers/mailer.js'),
	donorsController = require('./controllers/donors.js'),
	donationsController = require('./controllers/donations.js');


args = {};
process.argv.forEach(function(elem, ind, arr){
    if(ind > 1){
        var arg = elem.split('=');
        if(arg.length > 0){
            args[arg[0].replace("--", "").replace("-", "")] = arg[1];
        }
    }
});

if(!args.local){
    console.log("Error: faltan argumentos");
    process.exit();
}

donorsController.init(app);
donationsController.init(app);

var mongoose;

if(args.local == "true"){
    var tungus = require('tungus');
    mongoose = require("./node_modules/tingodb/node_modules/mongoose");
    global.TUNGUS_DB_OPTIONS =  { nativeObjectID: true, searchInArray: true };
    mongoose.connect('tingodb://db', function (err) {
        if(err){
            console.log("Error conectando:", err);
            process.exit(1);
        }
        else{
            console.log("Connected to MongoDB(TingoDB)!");
            var command;
            if(process.platform == "win32" || process.platform == "win64"){
                command = 'start chrome "http://127.0.0.1:8080/#/"';
            }
            else if(process.platform == "linux"){
                command = 'sensible-browser "http://127.0.0.1:8080/#/"';
            }
            else{
                console.log("Sistema operativo desconocido", process.platform);
                process.exit();
            }
            childProcess.exec(command, function (err) {
                if(err){
                    console.log("No se pudo iniciar la aplicacion: ", err)
                }
            })
        }
    });
}
else{
    mongoose = require("mongoose");
    mongoose.connect('mongodb://donantes:gigoju16@127.0.0.1:27017/donantes', {
      useMongoClient: true
    }, function(err){
        if(err){
            console.log("Error conectando al MongoDB ", err);
            process.exit(1);
        }
        else{
            console.log("Connected to MongoDB!");
        }
        mailerController.init(app);
    });
}
