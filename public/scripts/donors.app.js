angular.module( 'dontantesModule', [ 'ngMaterial', 'ui.router' ] )

.config(function($stateProvider){
	
	var donorsState = {
		name: 'donors',
		url: '/donors',
		templateUrl: 'http://127.0.0.1:9300/static/templates/donors.html',
		resolve: {
			donors:  function($http){
				return $http({method: 'GET', url: 'http://127.0.0.1:9300/donors/search?size=10&sort=modificatedAt'})
					   .then (function (data) {
						   return data.data;
					   });
			}
		},
		controller: function($scope, donors){
			$scope.donors = donors;
			$scope.optionsOpen = false;
		}
	}
	
	var donorState = {
		name: 'donor',
		url: '/donor/:_id?',
		templateUrl: 'http://127.0.0.1:9300/static/templates/donors.edit.html',
		resolve:{
			donor:  function($stateParams, $http){
				if(!$stateParams._id){
					return {name: '', phones: [], mails: []};
				}
				else{
					return $http({method: 'GET', url: 'http://127.0.0.1:9300/donor/' + $stateParams._id})
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
				
				$http({method: method, url: 'http://127.0.0.1:9300/donor', data: $scope.donor}).then(
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
				
				$http({method: 'DELETE', url: ('http://127.0.0.1:9300/donor/' + $scope.donor._id)}).then(
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
					templateUrl: 'http://127.0.0.1:9300/static/templates/donor.mail.html',
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
			};
		}
	}
	
	$stateProvider.state(donorsState);
	$stateProvider.state(donorState);
})