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
			$scope.donors = donors.items;
			$scope.donorsCount = donors.total;
			$scope.optionsOpen = false;
			$scope.query = {
				type: "idValue",
				value: ""
			};
			$scope.currentPage = 0;

			$scope.search = function(){
				if($scope.query.value.length > 2){
					$scope.processing = true;
					$scope.currentPage = 0;
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
				$scope.processing = true;
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
					$scope.donors = data.data.items;
					if(data.data.total){
						$scope.donorsCount = data.data.total;
					}
					$scope.processing = false;
					$scope.$apply();
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
				{name: '0+', slug: '0-plus'},
				{name: 'A+', slug: 'a-plus'},
				{name: '0-', slug: '0-minus'},
				{name: 'A-', slug: 'a-minus'},
				{name: 'B+', slug: 'b-plus'},
				{name: 'AB+', slug: 'ab-plus'},
				{name: 'B-', slug: 'b-minus'},
				{name: 'AB-', slug: 'ab-minus'}
			];

			$scope.showDate = function(aDate){
				return aDate > new Date('1910-01-01');
			}

			$scope.genders = ['Femenino', 'Masculino'];

			$scope.formatBirthday = function(aDate){
				return aDate.getDate().toString() + (aDate.getMonth() + 1).toString() + aDate.getFullYear().toString();
			};

			if(donor){
				donor.birthday = new Date(donor.birthday);
				$scope.donor = donor;
				/*if($scope.donor.birthday){
					$scope.donor.birthday = $scope.formatBirthday(new Date($scope.donor.birthday));
				}*/
			}
			else{
				$scope.donor = {name: '', phones: [], mails: []};
			}
			$scope.save = function(){
				var method = "PUT";
				if(!$scope.donor._id){
					method = "POST";
				}

				/*if($scope.donor.birthday){
					var bDate = $scope.donor.birthday.slice(2,4) + "/" + $scope.donor.birthday.slice(0,2) + "/" + $scope.donor.birthday.slice(4);
					$scope.donor.birthday = new Date(bDate);
					if ( isNaN($scope.donor.birthday.getTime() ) ) {
						siteFactory.toast("Error: fecha de nacimiento inválida");
						return;
					}
				}*/

				$http({method: method, url: 'donor', data: $scope.donor}).then(
					function(responseOK){
						if(responseOK.data._id){
							$scope.donor._id = responseOK.data._id;
							/*if($scope.donor.birthday){
								$scope.donor.birthday = $scope.formatBirthday($scope.donor.birthday);
							}*/
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

			$scope.donorStatus = function(action){
				if(action != 'activate' && action != 'archive'){
					console.error("Action not accepted")
					return;
				}
				var params = {
					idType: $scope.donor.idType,
					idValue: $scope.donor.idValue,
					action: action
				}
				$http({method: 'PUT', url: 'donor/status', data: params}).then(
					function(responseOK){
						var message = "Se dio de baja al donante";
						if(action == 'activate'){
							message = "Se reactivó el donante";
						}
						siteFactory.toast(message);
						$state.go($state.current, {}, {reload: true});
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast("NO se pudo dar de baja al donante");
					}
				);
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

.filter('donorStatus', function() { // register new filter

  return function(input) { // filter arguments

    switch(input){
    	case 201:
    		return "ACTIVO";
    		break;
    	case 423:
    		return "BAJA";
    		break;
    	default:
    		console.log("Auch!");
    }

  };

})
