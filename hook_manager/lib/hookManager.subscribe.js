'use strict';

var bramqp = require('bramqp'),
    async = require('async'),
    net = require('net'),
    util = require('util'),
    createdExchange = {};


module.exports = {
    init: function(config){
        return (function(options, __callback) {
            var socket = net.connect(
                config.amqpClient
            )
            var amqpClientLogin = config.amqpClient.login;
            var amqpClientPasscode = config.amqpClient.passcode;
            var amqpClientVHost = config.amqpClient.vhost;
            var defaultExchangeType = config.defaultExchangeType ? config.defaultExchangeType : 'topic'

            // Validar options obligatorias (list y bindExchange)
            if (!options.list || !options.bindings || typeof __callback != 'function') {
                throw new Error ('Missing options or wrongs arguments');
            }

            var self = this;
            var exchangeType = options.exchangeType ||  defaultExchangeType;
            var list = options.list;
            var rk = options.rk || false;
            var bindings = !util.isArray(options.bindings) ? [options.bindings] : options.bindings;


            bramqp.initialize(socket, 'rabbitmq/full/amqp0-9-1.stripped.extended', function(error, handle) {
                handle.openAMQPCommunication(amqpClientLogin, amqpClientPasscode, true, amqpClientVHost, function (errCommunication) {

                    console.log('Connecteeed to RabbitMQ...');

                    async.each(
                        bindings,
                        function (bind, nextBind) {
                            async.series(
                                [
                                    function(seriesCallback) {
                                        // Declaro el exchange a la fuerza, esto no debería molestar ya que se declaran de la misma forma
                                        handle.exchange.declare(1, bind, exchangeType, false, false, true);
                                        handle.once('1:exchange.declare-ok', function(channel, method, data) {
                                            console.log(bind + ' declared');
                                        });
                                        seriesCallback();
                                    }, function(seriesCallback) {
                                        handle.queue.declare(1, list, false, true, false, false, false, {});
                                        handle.once('1:queue.declare-ok', function(channel, method, data) {
                                            console.log(list + ' queue declared');
                                            handle.queue.bind(1, list, bind, rk, false, {});
                                            handle.once('1:queue.bind-ok', function() {
                                                console.log('queue ' + list + ' bound to ' + bind);
                                                seriesCallback();
                                            });
                                        });
                                    }, function(seriesCallback) {
                                        handle.basic.qos(1, 0, 1, false);
                                        handle.once('1:basic.qos-ok', function(channel, method, data) {
                                            seriesCallback();
                                        });
                                    }
                                ],
                                function () {
                                    nextBind(null);
                                }
                            );
                        },
                        function (errBindind) {
                            handle.basic.consume(1, list, null, false, false, false, false, {});
                            handle.once('1:basic.consume-ok', function(channel, method, data) {
                                console.log('Consuming from queue ' + list);
                                handle.on('1:basic.deliver', function(channel, method, data) {
                                    console.log('Incomming message');
                                    data.routingKey = data['routing-key'];
                                    data.contentType = 'application/json';

                                    handle.once('content', function(channel, className, properties, content) {
                                        var _obj = {
                                            message: JSON.parse(content.toString()),
                                            headers: [],
                                            deliveryInfo: data,
                                            ack: {
                                                acknowledge: function (isOk) {
                                                    if (isOk) {
                                                        console.log('Message accepted');
                                                        handle.basic.ack(1, data['delivery-tag']);
                                                    } else {
                                                        console.log('Message rejected');
                                                        handle.basic.nack(1, data['delivery-tag'], false, true);
                                                    }
                                                }
                                            }
                                        };

                                        var __seudoClass = {
                                            subscribe: function (seudoArgs, _callback) {
                                                return _callback(_obj.message, _obj.headers, _obj.deliveryInfo, _obj.ack);
                                            },
                                            shift: function (ack, retry) {
                                                _obj.ack.acknowledge(!retry);
                                            }
                                        }

                                        return __callback(_obj, __seudoClass);
                                    });
                                });
                            });
                        }
                    )
                });
            });
        });
    }
}
