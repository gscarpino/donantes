'use strict';

var bramqp = require('bramqp'),
    async = require('async'),
    net = require('net'),
    util = require('util'),
    createdExchange = {};


module.exports = {
    init: function(config){
        console.log("config",config)
        return (function(hook, object, __callback) {
            var _connection = new net.Socket();
            var socket = _connection.connect(config.amqpClient);

            var amqpClientLogin = config.amqpClient.login;
            var amqpClientPasscode = config.amqpClient.passcode;
            var amqpClientVHost = config.amqpClient.vhost;
            var defaultExchangeType = config.defaultExchangeType ? config.defaultExchangeType : 'topic'
            var self = this;
            if (!hook.event || !hook.exchanges) {
                console.log("Hooks mal configurados");
                return __callback();
            }

            if (!util.isArray(hook.exchanges)) {
                hook.exchanges = [hook.exchanges];
            }


            /*socket.setTimeout(1000, function () {
                this.end();
                this.destroy();
                console.log("timeout y reintento");
                self.invoke(hook, object, __callback);
            });*/

            socket.on('connect', function () {
                var _sock = this;
                console.log("Se conecto cheeee")
                bramqp.initialize(socket, 'rabbitmq/full/amqp0-9-1.stripped.extended', function(error, handle) {
                    async.eachSeries(
                        hook.exchanges,
                        function (exchange, nextExt) {
                            async.series([
                                function(seriesCallback) {
                                    handle.on('method', function(channel, className, method, data) {
                                        console.log('Incoming method: ' + className + '.' + method.name);
                                    });
                                    handle.openAMQPCommunication(amqpClientLogin, amqpClientPasscode, true, amqpClientVHost, seriesCallback);
                                },
                                function(seriesCallback) {
                                    if ( createdExchange[exchange] == true ) {
                                        return seriesCallback();
                                    }
                                    var exchangeType = hook.exchangeType ? hook.exchangeType : defaultExchangeType;
                                    handle.exchange.declare(1, exchange, exchangeType, false, false, true);
                                    handle.once('1:exchange.declare-ok', function(channel, method, data) {
                                        console.log(exchange + ' declared');
                                        createdExchange[exchange] = true;
                                        return seriesCallback();
                                    });
                                }, function(seriesCallback) {
                                    var routingKey = hook.routingKey;
                                    handle.basic.publish(1, exchange, routingKey, false, false, function() {
                                        console.log("Sending message to " + exchange + ' whit routing key ' + routingKey);
                                        handle.content(1, 'basic', {'content-type' : 'application/json', 'destiny': routingKey}, JSON.stringify(object), function (errorSend) {
                                            return seriesCallback();
                                        });
                                    });
                                }, function(seriesCallback) {
                                    handle.closeAMQPCommunication(seriesCallback);
                                    //seriesCallback();
                                }, function(seriesCallback) {
                                    handle.socket.end();
                                    setImmediate(seriesCallback);
                                }
                            ], function(err) {
                                nextExt(null);
                            });
                        },
                        function (err) {
                            _sock.destroy();
                            _sock.end();
                            return __callback();
                        }
                    )
                });
            });
        });
    }
}
