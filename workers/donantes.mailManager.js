var fs = require('fs'),
    async = require('async'),
    config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8')),
    hooks = require('hook_manager').init(config),
    ses = require('node-ses'),
    client = ses.createClient({
        key: config.amazon.ses.key,
        secret: config.amazon.ses.secret,
        amazon: config.amazon.ses.url
    });

var options = {
    bindings: ['MAILER'],
    list: "donantes.mailer",
    rk: "donantes.mail.send"
}

var footer = "<br><br>Si desea desuscribirse haga click <a href='http://54.201.247.68:8080/#/unsuscribe' target='_blank'>aquí</a>";

hooks.subscribe(options, function(object){
    var message = object.message;
    if(!message.to){
        return object.ack.acknowledge(true);
    }
    var mailSets = [];
    if(!Array.isArray(message.to)){
        message.to = [message.to];
    }
    var mailSetLength = message.to.length / config.amazon.limitToMails;
    while(message.to.length > 0){
        mailSets.push(message.to.splice(0,config.amazon.limitToMails-1));
    }
    console.log("mail sets", mailSets);
    var erroredMailSet = [];
    async.eachSeries(
        mailSets,
        function(mailSet, nextMailSet){
            client.sendEmail(
                {
                    from: '"Donantes voluntarios de sangre" <donantes.voluntarios.sangre@gmail.com>', // sender address
                    bcc: mailSets, // list of receivers
                    subject: message.subject ? message.subject : "Sin asunto", // Subject line
                    altText: message.body ? message.body : ".", // plain text body
                    message: message.body ? (message.body +  footer) : footer// html body
                },
                function (err, data, response) {
                    if(err){
                        return nextMailSet("Error enviando mail: " + err);
                    }
                    var _res = response.toJSON();
                    if(_res.statusCode != 200){
                        nextMailSet.push(mailSet);
                        return nextMailSet("Error (" + _res.statusCode + ")");
                    }
                    console.log(config.amazon.limitMailRate);
                    setTimeout(function() {nextMailSet();}, config.amazon.limitMailRate);
                }
            );
        },
        function(errSend){
            if(errSend){
                console.log(errSend);
            }
            if(erroredMailSet.length > 0 ){
                //TODO:
                console.log("Set con error:", erroredMailSet);
            }
            console.log("Finished processing message");
            return object.ack.acknowledge(!errSend);
        }
    );
});


