angular.module( 'donacionesModule', [ 'ngMaterial', 'ui.router' ] )

.config(function($stateProvider,$httpProvider){

		$httpProvider.defaults.headers.delete = { "Content-Type": "application/json;charset=utf-8" };

		var donationsState = {
		name: 'donations',
		url: '/donaciones/:q?',
		templateUrl: 'static/templates/donations.html',
		resolve: {
			donations:  function($http, $stateParams){
				var url = 'donations/search?size=10&sort=modificatedAt';
				if($stateParams.q){
					url = 'donations/search?q=' + $stateParams.q + '&size=10&sort=modificatedAt';
				}

				return $http({method: 'GET', url: url})
					   .then (function (data) {
						   return data.data;
					   });
			}
		},
		controller: function($scope, donations, $state){
			$scope.donations = donations;
			$scope.optionsOpen = false;
		}
	}

	var donationState = {
		name: 'donation',
		url: '/donacion/:_id?',
		params: {
			theParams: null
		},
		templateUrl: 'static/templates/donations.edit.html',
		resolve:{
			donation:  function($stateParams, $http){
				if(!$stateParams._id){
					if($stateParams.theParams && $stateParams.theParams.donor){
						return {donor: $stateParams.theParams.donor, donationDate: new Date()};
					}
					else{
						return {donationDate: new Date()};
					}
				}
				else{
					return $http({method: 'GET', url: 'donation/' + $stateParams._id})
						   .then (function (data) {
							   data.data.donationDate = new Date(data.data.donationDate);
							   return data.data;
						   });
				}
			}
		},
		controller: function($scope, donation, $q, $http, siteFactory, $state){

			$scope.donationTypes = ["Sangre", "Plaquetas"];
			$scope.donorTypes = ["Voluntario", "Reposicion"];

			$scope.donation = donation;

			$scope.querySearch = function(q){
				//Bug de la directiva de material, no toma en cuenta minimo
				var deferred = $q.defer();
				if(q.length < 3){
					deferred.resolve( [] );
				}
				else{
					var query = {
						name: q
					};
					var queryString = encodeURI(JSON.stringify(query));

					$http({method: 'GET', url: 'donors/search?reg=' + queryString + '&size=10&sort=modificatedAt'})
					   .then (function (data) {
						   deferred.resolve( data.data );
					   });
				}

				return deferred.promise;
			}

			$scope.save = function(){
				var method = "PUT";
				if(!$scope.donation._id){
					method = "POST";
				}

				var _data = JSON.parse(JSON.stringify($scope.donation));

				_data.donor = $scope.donation.donor._id;

				$http({method: method, url: 'donation', data: _data}).then(
					function(responseOK){
						if(responseOK.data._id){
							$scope.donation._id = responseOK.data._id;
						}
						siteFactory.toast("Se guardo la informacion");
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast(responseError.data);
					}
				);

			};

			$scope.delete = function(){
				if(!$scope.donation._id){
					return;
				}

				var _data = JSON.parse(JSON.stringify($scope.donation));

				_data.donor = $scope.donation.donor._id;

				$http({method: 'DELETE', url: 'donation', data: _data}).then(
					function(responseOK){
						$state.go('donations');
						siteFactory.toast("Se borro la donacion");
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast("NO se pudo borrar la donacion");
					}
				);

			};
		}
	}

	$stateProvider.state(donationsState);
	$stateProvider.state(donationState);

})
