angular.module( 'donantesApp', [ 'ngMaterial', 'ui.router', 'dontantesModule', 'donacionesModule', 'angularMoment', 'angularTrix'] )

.config(function($stateProvider){

	var initState = {
		name: 'home',
		url: '/',
		templateUrl: 'static/templates/home.html',
		controller: function($scope){
			console.log("yeah!")
		}
	}

	var searchState = {
		name: 'search',
		url: '/busqueda',
		templateUrl: 'static/templates/search.html',
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
				var url = 'donors/search?q=' + query + '&sort=modificatedAt';

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
					templateUrl: 'static/templates/donor.mail.html',
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
						$http({method: 'POST', url: ('mail/'), data: send}).then(
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

	var stateUnsuscribe = {
		name: 'unsuscribe',
		url: '/unsuscribe/:token',
		templateUrl: 'static/templates/unsuscribe.html',
		controller: function($scope, $http, token){
			$scope.unsuscribe = function(){
				if(!token){
					siteFactory.toast("NO se pudo desuscribir el mail, falta información");
					return;
				}
				$http({method: 'POST', url: ('unsuscribe/'), data: token}).then(
					function(responseOK){
						siteFactory.toast("Se desuscribió correctamente");
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast("NO se pudo desuscribir el mail");
					}
				);
			}
		},
		resolve: {
			token:  function($stateParams, $http){
				if($stateParams.token){
					return $stateParams.token
				}
			}
		}
	};

	var statsState = {
		name: 'stats',
		url: '/estadisticas',
		templateUrl: 'static/templates/stats.html'
	}

	$stateProvider.state(initState);
	$stateProvider.state(searchState);
	$stateProvider.state(statsState);
	$stateProvider.state(stateUnsuscribe);

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
