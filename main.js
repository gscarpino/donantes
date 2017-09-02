var server = require('./server.js').init(),
	app = require('./server.js').app,
	childProcess = require('child_process'),
    authController = require('./controllers/auth.js'),
	donorsController = require('./controllers/donors.js'),
	donationsController = require('./controllers/donations.js'),
    mailerController;


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

var schemas = require('./db/schemas.js');
schemas.init(args.local, function(models){
    if(args.local == "true"){
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
        mailerController = require('./controllers/mailer.js');
    }
    else{
        mailerController = require('./controllers/mailerSES.js');
    }
    authController.init(app, models);
    mailerController.init(app, models);
    donorsController.init(app, models);
    donationsController.init(app, models);
});
