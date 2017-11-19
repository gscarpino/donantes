var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./aws.sqs.config.json');

// Create SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var params = {};

var queueURL = "https://sqs.us-west-2.amazonaws.com/416017054729/ses_donantes_fail";

var params = {
 AttributeNames: [
    "SentTimestamp"
 ],
 MaxNumberOfMessages: 1,
 MessageAttributeNames: [
    "All"
 ],
 QueueUrl: queueURL,
 VisibilityTimeout: 0,
 WaitTimeSeconds: 0
};

sqs.receiveMessage(params, function(err, data) {
  if (err) {
    console.log("Receive Error", err);
  } else {
    console.log(data);
    data.Messages.forEach(function(aMessage){
        var item = JSON.parse(aMessage.Body);
        if(item.Type == "Notification"){
            var notification = JSON.parse(item.Message);
            console.log(notification);
        }
    });
    //process.exit();
    var deleteParams = {
      QueueUrl: queueURL,
      ReceiptHandle: data.Messages[0].ReceiptHandle
    };
    sqs.deleteMessage(deleteParams, function(err, data) {
      if (err) {
        console.log("Delete Error", err);
      } else {
        console.log("Message Deleted", data);
      }
    });
  }
});
