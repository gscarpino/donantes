angular.module( 'dontantesModule', [ 'ngMaterial', 'ui.router' ] )

.config(function($stateProvider){

	var donorsState = {
		name: 'donors',
		url: '/donors',
		templateUrl: 'static/templates/donors.html',
		resolve: {
			donors:  function($http){
				return $http({method: 'GET', url: 'donors/search?size=50&sort=modificatedAt'})
					   .then (function (data) {
						   return data.data;
					   });
			}
		},
		controller: function($scope, donors, $http, $mdDialog){
			$scope.donors = donors;
			$scope.optionsOpen = false;
			$scope.query = {
				type: "idValue",
				value: ""
			};
			$scope.currentPage = 0;

			$scope.search = function(){
				if($scope.query.value.length > 2){
					var q = {}
					q[$scope.query.type] = $scope.query.value;
					$scope.searchWithQuery(q);
				}
			};

			$scope.changePage = function(action){
				if(action == "next"){
					$scope.currentPage++;
				}
				else if(action == "previous"){
					$scope.currentPage--;
				}
				else{
					console.error("Invalid action");
					return;
				}
				if($scope.query.value && $scope.query.value.length > 2){
					var q = {}
					q[$scope.query.type] = $scope.query.value;
					q.skip = $scope.currentPage * 50;
				}
				else{
					var q = {
						skip: $scope.currentPage * 50
					}
				}
				$scope.searchWithQuery(q);
			};

			$scope.searchWithQuery = function(query){
				var query = encodeURI(JSON.stringify(query));
				var url = 'donors/search?reg=' + query + '&sort=modificatedAt';

				$http({method: 'GET', url: url}).then (function (data) {
					$scope.donors = data.data;
				});
			};

			$scope.sendMail = function(ev){
				if(!$scope.donors || $scope.donors.length == 0){
					return;
				}
				console.log("$scope.donors",$scope.donors)
				$mdDialog.show({
					controller: function($scope, $mdDialog, mails, ids) {
						console.log("mails",mails);
						$scope.mail = {};
						$scope.mail.to = mails;
						$scope.ids = ids;

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
						mails: [].concat.apply([], $scope.donors.map(function(elem){return elem.mails;}).filter(function(elem){return elem.length > 0;})),
						ids: [].concat.apply([], $scope.donors.map(function(elem){return elem._id;}))
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

	var donorState = {
		name: 'donor',
		url: '/donor/:_id?',
		templateUrl: 'static/templates/donors.edit.html',
		resolve:{
			donor:  function($stateParams, $http){
				if(!$stateParams._id){
					return {name: '', phones: [], mails: []};
				}
				else{
					return $http({method: 'GET', url: 'donor/' + $stateParams._id})
						   .then (function (data) {
							   return data.data;
						   });
				}
			}
		},
		controller: function($scope, donor, $http, $state, siteFactory, $mdDialog){
			$scope.idTypes = ['DNI', 'CI', 'Pasaporte'];
			$scope.bloodTypes = [
				{name: 'A+', slug: 'a-plus'},
				{name: 'A-', slug: 'a-minus'},
				{name: 'B+', slug: 'b-plus'},
				{name: 'B-', slug: 'b-minus'},
				{name: 'AB+', slug: 'ab-plus'},
				{name: 'AB-', slug: 'ab-minus'},
				{name: '0+', slug: '0-plus'},
				{name: '0-', slug: '0-minus'}
			];

			$scope.showDate = function(aDate){
				return aDate > new Date('1910-01-01');
			}

			$scope.genders = ['Femenino', 'Masculino'];

			if(donor){
				donor.birthday = new Date(donor.birthday);
				$scope.donor = donor;
			}
			else{
				$scope.donor = {name: '', phones: [], mails: []};
			}
			$scope.save = function(){
				var method = "PUT";
				if(!$scope.donor._id){
					method = "POST";
				}

				$http({method: method, url: 'donor', data: $scope.donor}).then(
					function(responseOK){
						if(responseOK.data._id){
							$scope.donor._id = responseOK.data._id;
						}
						siteFactory.toast("Se guardo la informacion");
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast(responseError.data);
					}
				);

			};


			$scope.delete = function(ev) {
				// Appending dialog to document.body to cover sidenav in docs app
				var confirm = $mdDialog.confirm()
					.title('Se van a borrar todas las donaciones que esten asociadas al donate')
					.textContent('El donante y todas las donaciones asociadas al mismo van a ser eliminados para siempre')
					.ariaLabel('Confirmacion de eliminacion del donante ' + $scope.donor.name)
					.targetEvent(ev)
					.ok('OK')
					.cancel('Cancelar');
				$mdDialog.show(confirm).then(function() {
					$scope.confirmDelete();
				}, function() {

				});
			};

			$scope.confirmDelete = function(){
				if(!$scope.donor._id){
					return;
				}

				$http({method: 'DELETE', url: ('donor/' + $scope.donor._id)}).then(
					function(responseOK){
						$state.go('donors');
						siteFactory.toast("Se borro el donante");
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast("NO se pudo borrar el donante");
					}
				);

			};

			$scope.theDonations = function(){

				var query = {
					donor: {
						_id: $scope.donor._id
					}
				};

				var queryString = encodeURI(JSON.stringify(query));
				$state.go('donations', {q: queryString});
			};

			$scope.addDonation = function(){
				$state.go('donation', {theParams: {donor: $scope.donor}});
			};

			$scope.sendMail = function(ev){
				if(!$scope.donor._id){
					return;
				}

				$mdDialog.show({
					controller: function($scope, $mdDialog, mails) {
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
						mails: $scope.donor.mails
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
			};
		}
	}

	$stateProvider.state(donorsState);
	$stateProvider.state(donorState);
})
