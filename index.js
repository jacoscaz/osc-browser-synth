




//
// Deps
//





var osc    = require('osc');
var http   = require('http');
var ws     = require('ws');
var Router = require('router');
var static = require('node-static');





//
// Vars
//





var config;        // Configuration as read from ./config
var server;        // HTTP server instance
var router;        // Express-derived router instance
var file;          // Static file server instance
var wsServer;      // WebSocket server instance
var oscWsPorts;    // Array of active OSC WS port instances
var oscUdpPort;    // OSC UDP port instance
var oscUdpDevices; // Array of address/port duples 





//
// CONFIG, HTTP SERVER/ROUTER, FILE SERVER
//





// Instantiates the router

router = new Router();

// Acquire config from file

config = require('./config.json');
oscUdpDevices = config.oscUdpDevices;

// Serves config 

router.get('/config.json', function(res, res) {
  var body = JSON.stringify(config);
  res.setHeader('content-type', 'application/json');
  res.setHeader('content-length', Buffer.byteLength(body));
  return res.end(body);
});

// Instantiates the file server

file = new static.Server('./public');

// Relays requests to the file server

router.get('*', function(req, res, next) {
  return req.on('end', function () {
    file.serve(req, res);
  }).resume();
});

// Instantiates the HTTP server

server = http.createServer(function(req, res) {
  return router(req, res, function(routeErr) {
    if (routeErr) {
      req.statusCode = 500;
      return res.end(routeErr.message);
    } else {
      req.statusCode = 404;
      return res.end();
    }
  });
});





//
// WEBSOCKETS
//





// Instantiates the WS server 

wsServer   = new ws.Server({port: config.wsPort});

// Active OSC WS ports end up here

oscWsPorts = [];

wsServer.on('connection', function (wsock) {
  var oscWsPort = new osc.WebSocketPort({socket: wsock});
  oscWsPort.on('error', console.log);

  // Forwards OSC messages coming from OSC devices connected via WS
  // to OSC devices listening over UDP (see config.json)

  oscWsPort.on('message', function (oscMsg) {
    var devices = config.oscUdpDevices;
    for (var i = 0; i < oscUdpDevices.length; i++) {
      oscUdpPort.send(oscMsg, devices[i].address, devices[i].port);
    }
  });

  // Forwards OSC bundles coming from OSC devices connected via WS
  // to OSC devices listening over UDP (see config.json)

  oscWsPort.on('bundle', function(oscBundle) {
    var devices = config.oscUdpDevices;
    for (var i = 0; i < oscUdpDevices.length; i++) {
      oscUdpPort.send(oscMsg, devices[i].address, devices[i].port); 
    }
  });

  // Removes a WS port that becomes inactive from the list
  // of active ports.

  oscWsPort.on('close', function() {
    var index = oscWsPorts.indexOf(oscWsPort);
    delete oscWsPorts[index];
  });

  // Adds the WS port to the list of active ports
  // (so that we can forward stuff to it)

  oscWsPorts.push(oscWsPort);

});





//
// UDP
//





// Opens an OSC UDP port so that we can
// listen for messages and bundles coming from UDP devices

oscUdpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: config.oscUdpPort
});

// Forwards OSC messages coming from OSC devices using UDP
// to OSC devices listening over WS ports

oscUdpPort.on('message', function (oscMsg) {
  for (var i = 0; i < oscWsPorts.length; i++) {
    oscWsPorts[i].send(oscMsg);
  }
});

// Forwards OSC bundles coming from OSC devices using UDP
// to OSC devices listening over WS ports

oscUdpPort.on('bundle', function (oscBundle) {
  for (var i = 0; i < oscWsPorts.length; i++) {
    oscWsPorts[i].send(oscBundle);
  }
});





//
// 3.. 2.. 1.. GO!
//





// Opens the OSC UDP port.

oscUdpPort.open();

// Starts the HTTP server

server.listen(config.httpPort, '0.0.0.0', function(listenErr) {
  if (listenErr) {
    throw listenErr;
  }
  console.log('Listening on port', config.httpPort);
});