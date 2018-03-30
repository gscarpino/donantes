var AWS = require('aws-sdk'),
    models = require('../db/schemas.js'),
    async = require('async'),
    fs = require('fs'),
    config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8')),
    hooks = require('hook_manager').init(config);

// Load credentials and set region from JSON file
AWS.config.loadFromPath('./aws.sqs.config.json');

// Create SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var params = {};

var queueURL = "https://sqs.us-west-2.amazonaws.com/416017054729/ses_donantes_fail";

var sqsInterval = 1000 * 60 * 60; //1 hora

var list = {
    exchanges: ['SQS'],
    routingKey: "donantes.mail.fail",
    event: "send"
}

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
        console.log("err",err, "data", data)
        callback(err);
    });
};

models.init(false, function(models){
    async.forever(
        function(nextIteration){
            sqs.receiveMessage(params, function(err, data) {
                if (err) {
                    console.log("err", err)
                    nextIteration(err);
                }
                else {
                    if(!data.Messages || data.Messages.length < 2){
                        if(!data.Messages){
                            console.log("No messages!")
                        }
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
                                                hooks.invoke(list, {bouncedEmail: bouncedEmail}, function(){
                                                    console.log("Message send for:", bouncedEmail)
                                                    nextBouncedEmail();
                                                });
                                            },
                                            function(errBounced){
                                                deleteMessage(aMessage, function(deleteError){
                                                    nextMessage();
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
