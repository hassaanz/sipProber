var pg = require('pg');

var config = require('./configuration.json');
var connStr = config.database.connStr;
var query = config.database.sql;

var getIps = function(cb) {
	pg.connect(connStr, function(err, client, done) {
		if (err) {
			return cb('Error fetching client from pool');
		}
		client.query(query, function(err, res) {
			if (err) {
				cb(err);
				done();
			} else {
				var configIps = [];
				var rows = res.rows;
				for (var i = 0; i < rows.length; i++) {
					configIps.push( {
						name: "Server " + i,
						ip: rows[i].ip_address
					});
				}
				configIps.push( {
					name: "Server 9999",
					ip: "192.168.56.4"
				});
				configIps.push( {
					name: "Server 9998",
					ip: "192.168.56.3"
				});
				cb(null, configIps);
				done();
			}
		});
	});
};
var testQuery = function() {
		pg.connect(connStr, function(err, client, done) {
		if (err) {
			console.log('Error fetching client from pool');
			console.log('%j', err);
		}
		console.log('connected to pg');
		client.query(query, function(err, res) {
			if (err) {
				console.log(err);
				done();
			} else {
				var configIps = [];
				var rows = res.rows;
				for (var i = 0; i < rows.length; i++) {
					configIps.push( {
						name: "Server " + i,
						ip: rows[i].ip_address
					});
				}
				console.log(configIps);
				done();
			}
		});
	});
};
module.exports = {
	getIps: getIps,
	testQuery : testQuery
}
