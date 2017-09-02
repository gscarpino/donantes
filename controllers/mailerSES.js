var fs = require('fs'),
    crypto = require('crypto'),
    config = JSON.parse(fs.readFileSync('/deploy/environment.json', 'utf8')),
    request = require('request'),
    hooks = require('hook_manager').init(config);

module.exports = {
    init: function(app){

        app.post('/mail', function (req, res) {
            console.log(req.body);
            if(!req.body.to || req.body.to.length == 0 || !req.body.body){
                return res.status(400).send('Url malformed');
            }
            //setup email data with unicode symbols
            //GENERAR TOKEN PARA DESUSCRIBIR: puede ser _id de mongo?

            var list = {
                exchanges: ['MAILER'],
                routingKey: "donantes.mail.send",
                event: "send"

            }
            hooks.invoke(list, req.body, function(){
                return res.jsonp({status: "ok"});
            })
        });

        app.post('/unsuscribe', function(req, res){
            console.log("body", req.body)
            if(!req.body.email || !req.body.response){
                return res.status(400).send('Url malformed');
            }
            var args = {
                url: "https://www.google.com/recaptcha/api/siteverify",
                form: {
                    secret: "6Lf5eS0UAAAAANetrh1ARqfm0oqWVMMuUMdEcKZm",
                    response: req.body.response
                }
            }
            request.post(args, function(err, response, body){
                console.log(body)
                console.log("type of:", typeof body);
                if(typeof body == "string"){
                    body = JSON.parse(body);
                }
                if(body.success){
                    var hash = crypto.createHash('sha256');
                    var ts = (new Date()).getTime();
                    var toHash = ts + req.body.email;
                    hash.on('readable', function(){
                        var data = hash.read();
                        if (data){
                            console.log(data.toString('hex'));

                            //TODO:
                            //- create document with index token, mail, date
                            //- change ts to suppott x time of window to desuscribe
                            //- send mail with token
                            return res.jsonp({status: "ok"});
                        }
                    });
                    hash.write(toHash);
                    hash.end();
                }
                else{
                    return res.status(401).send('Not authorized');
                }
            });
        });
    }
};
