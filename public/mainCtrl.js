angular.module('sipStack', ['btford.socket-io', 'ngAnimate'])
.factory('socketIO', function(socketFactory) {
	return socketFactory({
		ioSocket: io.connect()
	});
})
.controller('sipMain', ['$scope', 'socketIO', function ($scope, socket) {
	$scope.servers = {};
	$scope.refreshAll = function() {
		console.log('Refreshing servers list');
		socket.emit('servers');
	};
	socket.on('servers', function(data) {
		console.log('Got servers list');
		// console.log(data);
		$scope.servers = data;
		for (var i = 0; i < $scope.servers.length; i++) {
			$scope.servers[i].show = true;
		};
	});
	socket.on('serverInfo', function(data) {
		console.log('Got server update.');
		for (var i = 0; i < $scope.servers.length; i++) {
			if (data.ip === $scope.servers[i].ip) {
				$scope.servers[i] = data;
				$scope.servers[i].show = true;
			}
		}
	});
	socket.on('error', function(err) {
		console.log(err);
	});
	$scope.refreshOne = function(serverData) {
		console.log('Requesting server info.');
		serverData.show = false;
		var data = {ip: serverData.ip, name: serverData.name};
		// console.log(data);
		socket.emit('serverInfo', data);
	};
	$scope.getStatusClass = function(status) {
		if (status === 'down') {
			return 'label-danger';
		}
		if (status === 'up') {
			return 'label-success';
		}
	};
	$scope.refreshAll();
}])
// .directive('clickSpinner', ['$q', function ($q) {
// 	var spinnerId = 1;
// 	var directive = {
// 		restrict: 'A',
// 		link: link,
// 		transclude: true,
// 		scope: {
// 			clickHandler: '&clickSpinner'
// 		},
// 		template: '<span style="position: relative"><span ng-transclude></span></span>'
// 	};
// 	var opts = {
// 		width: 3,
// 		length: 3,
// 		lines: 9,
// 		radius: 4,
// 		color: '#C9D1FF'
// 	};
// 	return directive;
// 	function link(scope, element, attr) {
// 		var spinner = new Spinner(opts);
// 		var spinnerTarget = element.children();
// 		var textElement = spinnerTarget.children();
// 		function handler() {
// 			var p = $q.when(scope.clickHandler());
// 			attr.$set('disabled', true);
// 			textElement.css('visibility', 'hidden');
// 			spinner.spin(spinnerTarget[0]);
// 			p['finally'](function() {
// 				attr.$set('disabled', false);
// 				textElement.css('visibility', 'visible');
// 				spinner.stop();
// 			});
// 		}
// 		element.on('click', handler);
// 		scope.$on('$destroy', function() {
// 			element.off('click', handler);
// 		});
// 	}
// }]);