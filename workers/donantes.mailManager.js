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

var footer = "<br><br><span style='font-size:0.7em'>Si desea desuscribirse haga click <a href='http://54.201.247.68/#/unsuscribe' target='_blank' style='color: black; text-decoration: none;'>aquí</a></span>";

hooks.subscribe(options, function(object){
    var message = object.message;
    if(!message.to){
        console.log("Bad message");
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
    var erroredMailSet = [];

    var sender = message.sender ? message.sender : '"Donantes voluntarios de sangre" <donantes.voluntarios.sangre@gmail.com>';

    async.eachSeries(
        mailSets,
        function(mailSet, nextMailSet){
            console.log("mailSet", mailSet);
            console.log("LEN", mailSet.length);

            client.sendEmail(
                {
                    from: sender, // sender address
                    bcc: mailSet, // list of receivers
                    subject: message.subject ? message.subject : "Donantes Voluntarios de Sangre", // Subject line
                    altText: message.body ? message.body : ".", // plain text body
                    message: message.body ? (message.body +  footer) : footer// html body
                },
                function (err, data, response) {
                    if(err){
                        console.log("Error enviando mail: ", err);
                        console.log("DATA", data);
                        return nextMailSet(true);
                    }
                    var _res = response.toJSON();
                    if(_res.statusCode != 200){
                        erroredMailSet.push(mailSet);
                        console.log("Error (" + _res.statusCode + ")");
                        console.log("RESPONSE", _res);
                        return nextMailSet(true);
                    }
                    setTimeout(function() {nextMailSet();}, config.amazon.limitMailRate);
                }
            );
        },
        function(errSend){
            if(erroredMailSet.length > 0 ){
                //TODO:
                console.log("Set con error:", erroredMailSet);
            }
            console.log("Finished processing message");
            return object.ack.acknowledge(true);
        }
    );
});


