var AWS = require('aws-sdk'),
    models = require('../db/schemas.js'),
    async = require('async');

// Load credentials and set region from JSON file
AWS.config.loadFromPath('./aws.sqs.config.json');

// Create SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var params = {};

var queueURL = "https://sqs.us-west-2.amazonaws.com/416017054729/ses_donantes_fail";

var sqsInterval = 1000 * 60 * 60; //1 hora

var params = {
    AttributeNames: [
        "SentTimestamp"
    ],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: [
        "All"
    ],
    QueueUrl: queueURL,
    VisibilityTimeout: 0,
    WaitTimeSeconds: 0
};

var deleteMessage = function(message, callback){
    var deleteParams = {
        QueueUrl: queueURL,
        ReceiptHandle: message.ReceiptHandle
    };
    sqs.deleteMessage(deleteParams, function(err, data) {
        callback(err);
    });
};

models.init(false, function(models){
    async.forever(
        function(nextIteration){
            sqs.receiveMessage(params, function(err, data) {
                console.log("data",data)
                if (err) {
                    nextIteration(err);
                }
                else {
                    if(!data.Messages || data.Messages.length < 2){
                        sqsInterval = 1000 * 60 * 60; //1 hora
                    }
                    else{
                        sqsInterval = 1000 * 60;
                    }
                    async.eachSeries(
                        data.Messages,
                        function(aMessage, nextMessage){
                            var item = JSON.parse(aMessage.Body);
                            if(item.Type == "Notification"){
                                var notification = JSON.parse(item.Message);
                                switch(notification.notificationType){
                                    case "Bounce":
                                        async.eachSeries(
                                            notification.bounce.bouncedRecipients,
                                            function(bouncedEmail, nextBouncedEmail){
                                                console.log("BOUNCE EMAIL: ", bouncedEmail.emailAddress);
                                                models.donors.find({mails: bouncedEmail.emailAddress}, function(errFind, donors){
                                                    if(errFind){
                                                        console.log("Error buscando en mongo: ", errFind);
                                                        return;
                                                    }
                                                    if(!donors || donors.length == 0){
                                                        console.log("Error, no hubo resultados para: ", bouncedEmail.emailAddress)
                                                        return nextBouncedEmail();
                                                    }
                                                    async.eachSeries(
                                                        donors,
                                                        function(donor, nextDonor){
                                                            donorMails = donor.toObject().mails;
                                                            donorMails = donorMails.filter(function(anEmail){
                                                                return anEmail != bouncedEmail.emailAddress;
                                                            });
                                                            donor.set("mails", donorMails);
                                                            donor.save(function(errSave){
                                                                if(errSave){
                                                                    console.log("Error guardando en mongo: ", donor.toObject());
                                                                    return;
                                                                }

                                                                console.log("BOUNCE EMAIL DELETED: ", bouncedEmail.emailAddress);
                                                                nextDonor();
                                                            });
                                                        },
                                                        function(errDonor){
                                                            nextBouncedEmail();
                                                        }
                                                    );
                                                });
                                            },
                                            function(errBounced){
                                                deleteMessage(aMessage, function(deleteError){
                                                    nextMessage(deleteError);
                                                });
                                            }
                                        );
                                        break;
                                    default:
                                        console.log("Nothing to do with: ", notification);
                                        /*deleteMessage(aMessage, function(deleteError){
                                            nextMessage(deleteError);
                                        });*/
                                }
                            }

                        },
                        function(errMessage){
                            if(errMessage){
                                console.log("Error deleteing message:", errMessage);
                                return;
                            }
                            console.log("Waiting for next iteration...");
                            setTimeout(function() {
                                nextIteration();
                            }, sqsInterval);
                        }
                    )
                }
            });
        },
        function(errSqs){
            console.log(errSqs);
        }
    );
});
