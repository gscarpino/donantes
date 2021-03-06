angular.module( 'donantesApp', [ 'ngMaterial', 'ui.router', 'dontantesModule', 'donacionesModule', 'angularMoment', 'angularTrix'] )

.config(function($stateProvider){
	
	var initState = {
		name: 'home',
		url: '/',
		templateUrl: 'http://127.0.0.1:9300/static/templates/home.html'
	}
	
	var searchState = {
		name: 'search',
		url: '/busqueda',
		templateUrl: 'http://127.0.0.1:9300/static/templates/search.html',
		controller: function($scope, $http, siteFactory, $mdDialog){
			
			$scope.bloodTypes = ['A+','A-','B+','B-','AB+','AB-','0+','0-'];
			
			$scope.donationTypes = ["Sangre", "Plaquetas"];
			$scope.query = {};
			$scope.results = [];
			$scope.currentPage = 0;
			
			$scope.search = function(){
				var lastDonation = false;
				if($scope.query.lastDonationSearchType == "Fecha"){
					lastDonation = true;
					if(!$scope.query.lastDonationSearchValue){
						siteFactory.toast("No se ha especificado una fecha");
						return;
					}
					
					var _lastDonationValue = $scope.query.lastDonationSearchValue;
				}
				
				
				if($scope.query.lastDonationSearchType == "Periodo"){
					lastDonation = true;
					var substractionDays = $scope.query.lastDonationSearchValue[0];
					if($scope.query.lastDonationSearchValue[1] == 'months'){
						substractionDays *= 30;
					}
					else if($scope.query.lastDonationSearchValue[1] == 'years'){
						substractionDays *= 365;
					}
					
					//TODO: con momment crear la fecha de hoy y restarle substractionDays!!!
					var _lastDonationValue = moment().subtract(substractionDays, 'days').format("YYYY/MM/DD HH:mm:ss");
				}
				
				
				var q = {};
				
				if(lastDonation){
					q.lastDonation = {
						$lt: _lastDonationValue
					};
				}

				if($scope.query.bloodType && $scope.query.bloodType != '-'){
					q.bloodType = $scope.query.bloodType.replace("-", "-minus").replace("+", "-plus").toLowerCase();
				}
				
				if($scope.query.donationPlace){
					q.donationPlace = $scope.query.donationPlace;
				}

				if($scope.lastDonationType){
					q.donationType = $scope.query.lastDonationType;
				}

				$scope.parsedQuery = q;
				
				$scope.searchWithQuery(q);
				
			};

			$scope.nextPage = function(){
				$scope.currentPage++;
				$scope.parsedQuery.skip = $scope.currentPage * 50;
				$scope.searchWithQuery($scope.parsedQuery);
			};

			$scope.previousPage = function(){
				$scope.currentPage--;
				$scope.parsedQuery.skip = $scope.currentPage * 50;
				$scope.searchWithQuery($scope.parsedQuery);
			};

			$scope.searchWithQuery = function(query){
				var query = encodeURI(JSON.stringify(query));
				var url = 'http://127.0.0.1:9300/donors/search?q=' + query + '&sort=modificatedAt';
				
				$http({method: 'GET', url: url}).then (function (data) {
					$scope.results = data.data;
				});
			};
			
			$scope.resetQuery = function(){
				if($scope.query.lastDonationSearchType == 'Fecha'){
					$scope.query.lastDonationSearchValue = undefined;
				}
				else{
					$scope.query.lastDonationSearchValue = [];
				}
			};
			
			$scope.sendMail = function(ev){
				if(!$scope.results || $scope.results.length == 0){
					return;
				}
				console.log("$scope.results",$scope.results)
				$mdDialog.show({
					controller: function($scope, $mdDialog, mails) {
						console.log("mails",mails);
						$scope.mail = {};
						$scope.mail.to = mails;

						$scope.cancel = function() {
						  $mdDialog.cancel();
						};

						$scope.send = function(mail) {
						  $mdDialog.hide(mail);
						};
					},
					templateUrl: 'http://127.0.0.1:9300/static/templates/donor.mail.html',
					parent: angular.element(document.body),
					targetEvent: ev,
					clickOutsideToClose:true,
					locals: {
						mails: [].concat.apply([], $scope.results.map(function(elem){return elem.mails;}).filter(function(elem){return elem.length > 0;}))
					},
					fullscreen: true // Only for -xs, -sm breakpoints.
				})
				.then(function(send) {
					if(send){
						$http({method: 'POST', url: ('http://127.0.0.1:9300/mail/'), data: send}).then(
							function(responseOK){
								siteFactory.toast("Se envio el mail");
							},
							function(responseError){
								console.log("Response Error: ", responseError);
								siteFactory.toast("NO se pudo enviar el mail");
							}
						);
					}
				}, function() {
					siteFactory.toast('Mail cancelado');
				});
			}
		}
	}
	
	var statsState = {
		name: 'stats',
		url: '/estadisticas',
		templateUrl: 'http://127.0.0.1:9300/static/templates/stats.html'
	}
	
	$stateProvider.state(initState);
	$stateProvider.state(searchState);
	$stateProvider.state(statsState);
	
})

.factory('siteFactory', function($mdToast) {
	return {
		toast: function(message) {
			var pinTo = "top right";

			$mdToast.show(
			  $mdToast.simple()
				.textContent(message)
				.position(pinTo)
				.hideDelay(3000)
			);
		}
	};
})

.controller("mainController", function($scope, $state, $rootScope){
	

})