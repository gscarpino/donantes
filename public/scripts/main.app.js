angular.module( 'donantesApp',
	[
		'ngMaterial',
		'ui.router',
		'dontantesModule',
		'donacionesModule',
		'servicesModule',
		'angularMoment',
		'angularTrix',
		'vcRecaptcha'
	]
)

.config(function ($httpProvider) {
	$httpProvider.interceptors.push('httpRequestInterceptor');
})

.config(function($mdDateLocaleProvider) {
	$mdDateLocaleProvider.months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
	$mdDateLocaleProvider.shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    $mdDateLocaleProvider.days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    $mdDateLocaleProvider.shortDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
    $mdDateLocaleProvider.firstDayOfWeek = 1;
    $mdDateLocaleProvider.formatDate = function(date) {
       return moment(date).format('DD/MM/YYYY');
    };
})

.service('httpRequestInterceptor', [function() {
    var service = this;

    service.request = function(config) {
    	var t = window.localStorage.getItem("token");
    	if(t){
        	config.headers.Authorization = "Basic " + t;
    	}
        return config;
    };
}])

.config(function($stateProvider){

	var initState = {
		name: 'home',
		url: '/',
		templateUrl: 'static/templates/home.html',
		controller: function($scope){
			console.log("yeah!");
		}
	}

	var loginState = {
		name: 'login',
		url: '/login',
		templateUrl: 'static/templates/login.html',
		controller: function($scope, $http, $state, siteFactory){
			console.log("Para iniciar sesión!");
			$scope.username = "";
			$scope.password = "";
			$scope.gKey = "6Lf5eS0UAAAAAMnXQmExTkxd0a90mEVTyKvS2lev";

			$scope.setResponse = function(res){
				$scope.response = res;
			}

			$scope.login = function(){
				$http({method: 'POST', url: ('login/'), data: {u: $scope.username, p: $scope.password}})
					.then(
						function(response){
							window.localStorage.setItem("token", response.data.t);
							window.localStorage.setItem("sercice", JSON.stringify(response.data.service));
							siteFactory.toast("Inicio de sesión correcto");
							$state.go('home');
						},
						function(errResponse){
							siteFactory.toast("Error iniciando sesión");
							window.localStorage.removeItem("token");
							$state.go('login');
						}
					)
			}
		}
	}

	var logoutState = {
		name: 'logout',
		url: '/logout',
		template: '<h1>Gracias!</h1>',
		controller: function($scope, $http, $state, siteFactory){
			$http({method: 'POST', url: ('logout/')})
			.then(
				function(response){
					window.localStorage.setItem("token", "");
					window.localStorage.setItem("sercice", "");
					siteFactory.toast("Sesión cerrada correctamente");
					setTimeout(function() {
						$state.go('login');
					}, 5000);
				}
			)
		}
	};

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
				$scope.processing = true;

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

				q.status = 201;

				$scope.parsedQuery = q;

				$scope.searchWithQuery(q);

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
				$scope.parsedQuery.skip = $scope.currentPage * 50;
				$scope.searchWithQuery($scope.parsedQuery);
			};

			$scope.searchWithQuery = function(query){
				var query = encodeURI(JSON.stringify(query));
				var url = 'donors/search?q=' + query + '&sort=modificatedAt';

				$http({method: 'GET', url: url}).then (function (data) {
					$scope.results = data.data.items;
					if(data.data.total){
						$scope.donorsCount = data.data.total;
					}
					$scope.processing = false;
					$scope.$apply();
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
					controller: function($scope, $mdDialog, query) {
						$scope.mail = {};

						var q = JSON.parse(JSON.stringify(query));
						delete q.size;
						delete q.skip;
						$scope.mail.query = q;
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
						//mails: [].concat.apply([], $scope.results.map(function(elem){return elem.mails;}).filter(function(elem){return elem.length > 0;}))
						query: $scope.parsedQuery
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
		url: '/unsuscribe',
		templateUrl: 'static/templates/unsuscribe.html',
		controller: function($scope, $http, siteFactory){
			$scope.mail = "";
			$scope.gKey = "6Lf5eS0UAAAAAMnXQmExTkxd0a90mEVTyKvS2lev";
			$scope.unsuscribe = function(mail){
				if(!mail){
					siteFactory.toast("No se pudo desuscribir el mail, falta información");
					return;
				}
				$http({method: 'POST', url: ('unsuscribe/'), data: {email: mail, response: $scope.response}}).then(
					function(responseOK){
						siteFactory.toast("Se desuscribió correctamente");
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast("NO se pudo desuscribir el mail");
					}
				);
			}

			$scope.setResponse = function(res){
				$scope.response = res;
			}
		}
	};

	var stateUnsuscribed = {
		name: 'unsuscribed',
		url: '/unsuscribed/:t',
		templateUrl: 'static/templates/unsuscribed.html',
		resolve: {
			unsuscribed:  function($stateParams, $http, siteFactory){
				if(!$stateParams.t){
					siteFactory.toast("Error desuscribiendo");
					return false;
				}
				return $http({method: 'post', url: 'unsuscribed/' + $stateParams.t})
					   .then (function (data) {
						   return data.data;
					   });
			}
		},
		controller: function($scope, unsuscribed){
			$scope.status = unsuscribed.status;
		}
	};

	var mailsState = {
		name: 'mails',
		url: '/mails',
		templateUrl: 'static/templates/mails.html',
		controller: 'mailController'
	};

	var statsState = {
		name: 'stats',
		url: '/estadisticas',
		templateUrl: 'static/templates/stats.html'
	}

	$stateProvider.state(initState);
	$stateProvider.state(loginState);
	$stateProvider.state(logoutState);
	$stateProvider.state(searchState);
	$stateProvider.state(mailsState);
	$stateProvider.state(statsState);
	$stateProvider.state(stateUnsuscribe);
	$stateProvider.state(stateUnsuscribed);

})

.factory('siteFactory', function($mdToast, $http, $state) {
	var isLocalAuth = function(){
		return window.localStorage && window.localStorage.getItem("token");
	}
	return {
		toast: function(message) {
			var pinTo = "top right";

			$mdToast.show(
			  $mdToast.simple()
				.textContent(message)
				.position(pinTo)
				.hideDelay(3000)
			);
		},
		isAuthenticated: function(){
			if(isLocalAuth()){
				$http({method: 'POST', url: ('auth/'), data: {}})
					.then(
						function(response){
							console.log("response", response);
						},
						function(errResponse){
							console.log("errResponse", errResponse);
							window.localStorage.removeItem("token");
							$state.go('login');
						}
					)
			}
			else{
				$state.go('login');
			}
		},
		isLocalAuthenticated: function(){
			return isLocalAuth();
		}
	};
})

.controller("mainController", function($scope, $state, $rootScope, siteFactory){
	$scope.site = siteFactory;
	siteFactory.isAuthenticated();
	setInterval(function() {
		siteFactory.isAuthenticated();
	}, 60000);
	$rootScope.$on('$stateChangeStart',
		function(event, toState, toParams, fromState, fromParams){
			setTimeout(function() {
				if(siteFactory.isLocalAuthenticated()){
		    		siteFactory.isAuthenticated();
				}
			}, 0);
		}
	);
})


.directive('chooseFile', function() {
    return {
		link: function (scope, elem, attrs) {

			var button = elem.find('button');
			var input = angular.element(elem[0].querySelector('input#fileInput'));
			var preview = angular.element(elem[0].querySelector('img#previewImg'));
			var reader = new FileReader();

			button.bind('click', function() {
				input[0].click();
				updatePreview();
			});

			input.bind('change', function(e) {
				scope.$apply(function() {
					var files = e.target.files;
					if (files[0]) {
						scope.fileName = files[0].name;
					} else {
						scope.fileName = null;
					}

					updatePreview(files[0]);
				});
			});

			reader.onload = function (loadEvent) {
                    scope.$apply(function () {
                    	preview[0].src = loadEvent.target.result;
                    });
                }

			function updatePreview(file){
				if(!preview || !file) return;
				reader.readAsDataURL(file);
			}
		}
    };
})

.controller('mailController', function($scope, siteFactory, $http){
	$scope.currentNavItem = 'page1';

	$scope.mail = {
		subject: "",
		body: ""
	};
	$scope.files = {};



	$scope.sendMail = function(files){
		$scope.processing = true;

		var uploadUrl = "/upload";
		var fd = new FormData();

		if($scope.files.headerImg){
			fd.append('headerImg', $scope.files.headerImg);
		}

		if($scope.files.footerImg){
			fd.append('footerImg', $scope.files.footerImg);
		}

		fd.append('data', JSON.stringify($scope.mail))

		$http.post('mail/massive', fd, {
			transformRequest: angular.identity,
			headers: {'Content-Type': undefined}
		}).then(
			function(responseOK){
				siteFactory.toast("Se envio el mail");
				$scope.processing = false;
			},
			function(responseError){
				console.log("Response Error: ", responseError);
				siteFactory.toast("NO se pudo enviar el mail");
				$scope.processing = false;
			}
		);
		/*$http({method: 'POST', url: ('mail/massive'), data: $scope.mail})*/
	};
})

.directive('fileModel', ['$parse', function ($parse) {
    return {
       restrict: 'A',
       link: function(scope, element, attrs) {
          var model = $parse(attrs.fileModel);
          var modelSetter = model.assign;

          element.bind('change', function(){
             scope.$apply(function(){
                modelSetter(scope, element[0].files[0]);
             });
          });
       }
    };
 }])



.directive("inputDate", ['$filter',
	function($filter){
		return {
			link: function(scope, angularElement, attrs){
				scope.inputValue = scope.dateModel;

				scope.$watch('inputValue', function(value, oldValue) {

					value = String(value);
					var aDate = value.replace(/[^0-9]+/g, '');
					scope.dateModel = aDate;
					scope.inputValue = $filter('dfilter')(aDate);
				});

				scope.blockDelete = function(event){
					if (event.keyCode === 8 || event.keyCode === 46) {
				        event.stopPropagation();
				        event.preventDefault();
				    }
				};

				scope.cleanDate = function(){
					scope.dateModel = "";
					scope.inputValue = "";
					setTimeout(function() {
						scope.$apply();
					}, 0);
				}
			},
			restrict: 'E',
			scope: {
				datePlaceholder: '=placeholder',
				dateModel: '=model',
			},
			template: '<input ng-model="inputValue" ng-keydown="blockDelete($event)" class="md-input" type="text" maxlength="10" title="DD/MM/YYYY"><md-button class="md-raise" ng-click="cleanDate()" style="float: right;margin-top: -41px;min-width: 32px;"><i class="material-icons">close</i></md-button>'
		};
	}
])

.filter('dfilter', function() {
    return function (number) {

        if (!number) { return ''; }
        if(number.length > 2){
        	number = number.slice(0,2) + "/" + number.slice(2);
        }

        if(number.length > 5){
        	number = number.slice(0,5) + "/" + number.slice(5);
        }

        return number;
    };
});
