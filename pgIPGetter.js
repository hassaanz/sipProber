var pg = require('pg');

var connStr = "postgres://postgres:postgres@127.0.0.1/hassaan";
var query = "select ip_address from (select locations.ip_address, family(locations.ip_address::inet) as type from locations where locations.probe is not null) a where type = 4"

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