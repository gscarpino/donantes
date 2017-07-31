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

donorsController.init(app, config);
donationsController.init(app, config);

if(args.local){
    childProcess.exec('start chrome "http://127.0.0.1:9300/#/"', function (err) {
        if(err){
            console.log("No se pudo iniciar la aplicacion")
        }
    })
}
else{
    mailerController.init(app);
}
