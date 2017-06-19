var server = require('./server.js').init(),
	app = require('./server.js').app,
	childProcess = require('child_process'),
	mailerController = require('./controllers/mailer.js'),
	donorsController = require('./controllers/donors.js'),
	donationsController = require('./controllers/donations.js');


donorsController.init(app);
donationsController.init(app);
mailerController.init(app);


childProcess.exec('start chrome "http://127.0.0.1:9300/#/"', function (err) {
	if(err){
		console.log("No se pudo iniciar la aplicacion")
	}
})