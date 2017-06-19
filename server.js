var express = require('express'),
	app = express(),
	moment = require('moment'),
	bodyParser = require('body-parser');

module.exports = {
	init: function(){	
	
		var port = 9300;

		var logger = function (req, res, next) {
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Headers", "Origin, X-Requested-  With, Content-Type, Accept");
			
			if(req.method != 'OPTIONS')
				console.log(moment().format('YYYY-MM-DD HH:mm:ss') + ' ' + req.method + ' ' + req.originalUrl);
			next();
		};

		
		app.use(logger);
		
		app.use('/static', express.static('public'));
		
		app.use('/bower_components',  express.static(__dirname + '/bower_components'));
		
		app.get('/', function(req, res, next){
			var options = {
			root: './',
			headers: {
				'x-timestamp': Date.now(),
				'x-sent': true
			}
		  };

		  res.sendFile('index.html', options, function (err) {
			if (err) {
			  console.log(err);
			  res.status(err.status).end();
			}
			next();
		  });
		});
		
		app.use(bodyParser.urlencoded({ extended: false }))

		app.use(bodyParser.json())
		
		app.listen(port, function () {
		  console.log('Server listening on port ' + port + '!');
		});
		
	},
	app: app
}