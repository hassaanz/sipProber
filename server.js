/*
* Copyright (c) 2015 Interactive Intelligence
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var express = require('express');
var app = express();
var fs = require('fs');
var cors = require('cors');
var path = require('path');
//var email = require('emailjs');
var request = require('request');
var util = require('util');
var os = require('os');
var sip = require('sip');
var http = require('http');
var bodyParser = require('body-parser');
var email = require('emailjs/email');
var pgHandler = require('./pgIPGetter');

var httpServer = http.Server(app);
var io = require('socket.io')(httpServer);

app.use(express.static('public'));
app.use(cors());
app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.json());

var messageTimer = null;

console.log("app starting");

//Generates a random string, used in the options message
function rstring() { return Math.floor(Math.random()*1e6).toString(); }

var config = require('./configuration.json');
var devices = {};

sip.start({}, function(rq) {
	console.log('Sip started');
	pollDevices();
});



function handlerStatus(status) {
	sendOptions(status);
}
function pollDevices() {
	console.log('.');
	pgHandler.getIps(function(err, res) {
		var server;
		if (err) {
			console.log(err);
			for(var i=0; i< config.servers.length; i++){
				server = config.servers[i];
				var status = getServerStatus(server.name, server.ip);
				// console.log(status);
				sendOptions(status);
			}
		} else {
			config.servers = res;
			for(var j=0; j< config.servers.length; j++){
				server = config.servers[j];
				// console.log(server);
				getServerStatus(server.name, server.ip, handlerStatus);
			}
		}
	});
}

//sends an outbound email for status changes
function sendEmail(name, data) {
	if( config.notifications.email.configuration.host == null || config.notifications.email.configuration.host === ""){
		return;
	}
	var emailConfig = config.notifications.email.configuration;
	var server  = email.server.connect(emailConfig);

	var sendParams = config.notifications.email.message;
	sendParams.subject = "SIP Stack for " + name + " is " + data.status;
	sendParams.text = "Server: " + name + "\nIP: " + data.ip + "\nStatus: " + data.status;
	console.log("sending email to " + sendParams.to);
	server.send(sendParams, function(err, message) {
		if(err){
			console.log("ERROR sending email: " + err);
		}else{
			console.log("email sent");
		}
	});
}

function findServerFromIP(ip) {
	for (var i = 0; i < config.servers.length; i++) {
		var server = config.servers[i];
		if (server.ip == ip) {
			return server;
		}
	}
	return null;
}
function updateServerFromIP(ip, newData) {
	for (var i = 0; i < config.servers.length; i++) {
		var server = config.servers[i];
		if (server.ip == ip) {
			config.servers[i] = newData;
		}
	}   
}

//makes the outbound POST for a webhook when the status changes.
function sendWebHook(name, data) {
	if( config.notifications.webhook.host == null || config.notifications.webhook.host === ""){
		return;
	}
	data.name = name;
	// An object of options to indicate where to post to
	var post_options = {
		host: config.notifications.webhook.host,
		port: config.notifications.webhook.port,
		path: config.notifications.webhook.path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': JSON.stringify(data).length
		}
	};
	// Set up the request
	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');
	});
	// post the data
	console.log("calling webhook");
	post_req.write(JSON.stringify(data));
	post_req.end();
}
function getServerStatus(name, baseIp, cb) {
	ip = "sip:" + baseIp + ":5060";
	var sipOptions = {
		method: 'OPTIONS',
		uri: ip,
		headers: {
			to: {uri: ip},
			from: {uri: 'sip:test@test', params: {tag: rstring()}},
			'call-id': rstring(),
			cseq: {method: 'OPTIONS', seq: Math.floor(Math.random() * 1e5)},
			'content-type': 'application/sdp'
		}
	};
	sip.send(sipOptions, function(rs) {
		console.log('sipResp');
		var status = { ip: baseIp, name: name };
		if (rs.status === 200) {
			status.status = 'up';
		} else {
			status.status = 'down';
		}
		console.log(status);
		cb(status);
	});
}
//handles sending an options message to a server
function sendOptions(statusObj) {
	var oldData = findServerFromIP(statusObj.ip);
	if (oldData && oldData.status && oldData.status !== status.status){
		sendWebHook(name, status);
		sendEmail(name, status);
	} else if(oldData === null){
		sendWebHook(name, status);
		sendEmail(name, status);
	}
	updateServerFromIP(statusObj.ip, statusObj);
}

pgHandler.getIps(function(err, res) {
	var server;
	if (err) {
		console.log('Error connecting db. Using default list form config.json');
		httpServer.listen(app.get('port'), function() {
			console.log("SIP Verification app is running at localhost:" + app.get('port'));
		});
	} else {
		console.log('Updated Config from db');
		config.servers = res;
		httpServer.listen(app.get('port'), function() {
			console.log("SIP Verification app is running at localhost:" + app.get('port'));
			pollDevices();
			//timeout in the sip library is 120000 and is not configurable, lets set our poll higher than that so we don't have more than 1 ping at a time
			messageTimer = setInterval(pollDevices, 121000);
		});
	}
});

app.get('/', function(request, response){
	response.sendFile(path.join(__dirname,"index.html"));
});

app.post('/webhooktest', function(req, res){
	console.log('webhook received: ' + JSON.stringify(req.body));
	res.send();
});

io.on('connection', function(socket) {
	socket.on('servers', function() {
		console.log('Sending back servers');
		socket.emit('servers', config.servers);
	});
	socket.on('serverInfo', function(data) {
		console.log('SIO-serverInfo');
		console.log(data);
		getServerStatus(data.name, data.ip, function(status) {
			console.log('Got SIO serverInfo resp');
			// console.log(status);
			socket.emit('serverInfo', status);
		});
	});
	socket.on('error', function(err) {
		console.log('Error in socket');
		console.log(err);
	});
});