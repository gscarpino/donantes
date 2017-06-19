var tungus = require('tungus'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
global.TUNGUS_DB_OPTIONS =  { nativeObjectID: true, searchInArray: true };



var testSchema = Schema({
    name: String
  , developer: String
  , released: {type: Date, default: (new Date())}
  , consoles: Number
})

var testS = mongoose.model('testS', testSchema);

mongoose.connect('tingodb://db', function (err) {
	if(err){
		console.log("Error conectando:", err);
		process.exit(1);
	}
	
	test();
	
});

function test(){
	console.log("conectado!");
	testS.create({name: 'Prueba 2', consoles: 3}, function(err){
		if(err){
			console.log("Error creando documento: ", err);
		}
		else{
			console.log("Documento creado1!");
			
			verTodo();
		}
	});
}

var i = 1;

function verTodo(){
	testS.find({}, function(err,docs){
		if(err){
			console.log("Error buscando todo: ", err);
		}
		else{
			console.log("Encontrados: " + docs.length);
			console.log(docs);
			if(i == 1) removerr();
		}
	});
};

function removerr(){
	i--;
	testS.remove({name: 'Prueba 2'}, function(errRemove){
		if(errRemove){
			console.log("Error removiendo: ", errRemove);
		}
		else{
			console.log("Se removieron:");
			verTodo();
		}
	});
}