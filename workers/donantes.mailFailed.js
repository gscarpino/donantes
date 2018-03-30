var fs = require('fs'),
    async = require('async'),
    config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8')),
    hooks = require('hook_manager').init(config),
    models = require('../db/schemas.js');

var options = {
    bindings: ['SQS'],
    list: "donantes.sqs.fail",
    rk: "donantes.mail.fail"
}


models.init(false, function(models){
    hooks.subscribe(options, function(object){
        var emailAddress = object.message.bouncedEmail.emailAddress;
        models.donors.find({mails: emailAddress}, function(errFind, donors){
            if(errFind){
                console.log("Error buscando en mongo: ", errFind);
                return;
            }
            if(!donors || donors.length == 0){
                console.log("Error, no hubo resultados para: ", emailAddress)
                return object.ack.acknowledge(true);
            }

            async.eachSeries(
                donors,
                function(donor, nextDonor){
                    donorMails = donor.toObject().mails;
                    donorMails = donorMails.filter(function(anEmail){
                        return anEmail != emailAddress;
                    });
                    donor.set("mails", donorMails);
                    donor.save(function(errSave){
                        if(errSave){
                            console.log("Error guardando en mongo: ", donor.toObject());
                            return;
                        }

                        console.log("BOUNCE EMAIL DELETED: ", emailAddress);
                        nextDonor();
                    });
                },
                function(errDonor){
                    return object.ack.acknowledge(true);
                }
            );
        });
    })
})
