/**
 * Module dependencies.
 *
 */
var invokeManager = require('./lib/hookManager.invoke.js');
var subscribeManager = require('./lib/hookManager.subscribe.js');

module.exports = {
    init: function(config){
        return {
            invoke: invokeManager.init(config),
            subscribe: subscribeManager.init(config)
        }
    }
};
