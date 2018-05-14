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
		noauth: true,
		templateUrl: 'static/templates/home.html',
		controller: function($scope){
		}
	}

	var loginState = {
		name: 'login',
		url: '/login',
		noauth: true,
		templateUrl: 'static/templates/login.html',
		controller: function($scope, $http, $state, siteFactory){
			$http({method: 'get', url: 'services/names'})
               .then (function (data) {
                   $scope.services = data.data;
               },
               function(errData){
               	console.log("errServices", errData);
               	return null;
               });
			$scope.username = "";
			$scope.password = "";
			if(window.localStorage.getItem("service")){
				$scope.service = JSON.parse(window.localStorage.getItem("service"));
			}
			else{
				$scope.service = undefined;
			}
			$scope.gKey = "6Lf5eS0UAAAAAMnXQmExTkxd0a90mEVTyKvS2lev";

			function createFilterFor(query) {

		      var lowercaseQuery = angular.lowercase(query);

		      return function filterFn(service) {
		        return (service.name.toLowerCase().indexOf(lowercaseQuery) > -1);
		      };

		    }

			$scope.querySearch = function(query){
				return $scope.services.filter(createFilterFor(query));
			};

			$scope.setResponse = function(res){
				$scope.response = res;
			}

			$scope.login = function(){
				$http({method: 'POST', url: ('login/'), data: {u: $scope.username, p: $scope.password}})
					.then(
						function(response){
							window.localStorage.setItem("token", response.data.t);
							console.log("$scope.service", $scope.service);
							window.localStorage.setItem("service", JSON.stringify({name: $scope.service.name, _id: $scope.service._id}));
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
					siteFactory.toast("Sesión cerrada correctamente");
					setTimeout(function() {
						$state.go('login');
					}, 3000);
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
		noauth: true,
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
		noauth: true,
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

	var signupState = {
		name: 'signup',
		url: '/signup',
		noauth: true,
		templateUrl: 'static/templates/signup.html',
		controller: 'signupController'
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

	var settingsState = {
		name: 'settings',
		url: '/settings',
		templateUrl: 'static/templates/config.html',
		controller: function($scope, $http, siteFactory){

				var reader = new FileReader();
				var input = angular.element(window.document.querySelector('input#fileInput'));

				input.bind('change', function(e) {
					$scope.$apply(function() {
						var files = e.target.files;
						if (files[0]) {
							$scope.fileName = files[0].name;
						} else {
							$scope.fileName = null;
						}

						$scope.file =files[0];
					});
				});

			$scope.import = function(){
				$scope.processing = true;
				reader.onload = function(evt) {

					filecontent = evt.target.result;
					console.log("filecontent", filecontent)
					try{
						var content = JSON.parse(filecontent);
						$http({method: 'POST', url: '/donors/import', data: content}).then(
							function(responseOK){
								siteFactory.toast("Se envio a importar");
								$scope.processing = false;
							},
							function(responseError){
								console.log("Response Error: ", responseError);
								siteFactory.toast("NO se pudo enviar a importar");
								$scope.processing = false;
							}
						);
					}
					catch(e){
						//Mensaje de error
						siteFactory.toast("Error leyendo el archivo");
						console.log(e, filecontent);
					}
				};

				reader.readAsText($scope.file);
			};
		}
	}

	var confirmState = {
		name: 'confirm',
		noauth: true,
		url: '/confirm/:token',
		templateUrl: 'static/templates/confirm.html',
		controller: function($scope, token, $http, siteFactory, $state){
			console.log("token", token);
			$scope.user = {};
			$scope.gKey = "6Lf5eS0UAAAAAMnXQmExTkxd0a90mEVTyKvS2lev";
			$scope.setResponse = function(res){
				$scope.response = res;
			}

			$scope.canConfirm = function() {
				var setPass = $scope.user.password1 && $scope.user.password1.length > 0 && $scope.user.password2 && $scope.user.password2.length > 0;
				if(!setPass) {
					return false;
				}
				if($scope.user.password1 != $scope.user.password2){
					$scope.errors = "Las contraseñas son distintas";
					return false;
				}
				delete $scope.errors;
				return true;
			};

			$scope.confirm = function(){
				console.log("user",$scope.user)
				$http({method: "POST", url: 'confirm/' + token, data: {user: {password : $scope.user.password1}, response: $scope.response}}).then(
					function(responseOK){
						$state.go('home');
						siteFactory.toast("Registro confirmado");
					},
					function(responseError){
						console.log("Response Error: ", responseError);
						siteFactory.toast(responseError.data);
					}
				);
			}
		},
		resolve: {
			token:  function($stateParams){
				return $stateParams.token;
			}
		}
	}

	$stateProvider.state(initState);
	$stateProvider.state(loginState);
	$stateProvider.state(logoutState);
	$stateProvider.state(searchState);
	$stateProvider.state(mailsState);
	$stateProvider.state(statsState);
	$stateProvider.state(stateUnsuscribe);
	$stateProvider.state(stateUnsuscribed);
	$stateProvider.state(settingsState);
	$stateProvider.state(signupState);
	$stateProvider.state(confirmState);
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
	console.log("}}}}}", $state.current.name,"{{{{");
	if(!$state.current.name){
		$state.go('home');
	}
	setInterval(function() {
		if(!$state.current.noauth){
			siteFactory.isAuthenticated();
		}
	}, 1000 * 60 * 30);

	$rootScope.$on('$stateChangeStart',
		function(event, toState, toParams, fromState, fromParams){
			setTimeout(function() {
				if(!toState.noauth && siteFactory.isLocalAuthenticated()){
					siteFactory.isAuthenticated();
				} else {
					if( !toState.noauth ) {
						$state.go('login');
					}
				}
			}, 0);
		}
	);

	$rootScope.initialLocation = {
		latitude: -34.618175,
		longitude: -58.406526,
		zoom: 12
	}
})


.controller("signupController", function($scope, $state, $rootScope, siteFactory, $http){
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
	$scope.genders = ['Femenino', 'Masculino'];
	$scope.markers = [];
	$scope.user = {
		name: "",
		mail: "",
		idType: "",
		idValue: "",
		birthday: new Date()
	};

	$scope.gKey = "6Lf5eS0UAAAAAMnXQmExTkxd0a90mEVTyKvS2lev";

	$http({method: 'get', url: 'services/'})
       .then (function (data) {
			$scope.services = data.data;
			if($scope.services && $scope.services.length > 0){
				var myLatlng = new google.maps.LatLng($rootScope.initialLocation.latitude, $rootScope.initialLocation.longitude);
				var mapOptions = {
					zoom: 11,
					center: myLatlng
				}
				var map = new google.maps.Map(document.getElementById("signup-map-canvas"), mapOptions);

				for(var i = 0; i < $scope.services.length; i++){
					if($scope.services[i].location && $scope.services[i].location.latitude && $scope.services[i].location.longitude){
						var marker = new google.maps.Marker(
							{
								map: map,
								position: {
									lat: Number($scope.services[i].location.latitude),
									lng: Number($scope.services[i].location.longitude)
								},
								title: $scope.services[i].name,
								service: $scope.services[i],
								draggable: false
							}
						);
						$scope.markers.push(marker);
						marker.setMap(map);
					}
				}
				console.log($scope.markers)
			}
       },
       function(errData){
       	console.log("errServices", errData);
       	return null;
       });

    function rad(x) {return x*Math.PI/180;}
    $scope.searchServiceNearMe = function(){
    	if(navigator.geolocation){
    		navigator.geolocation.getCurrentPosition(
    			function(position){
    				console.log("Position: ", position);
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;
                    var R = 6371; // radius of earth in km
                    var distances = [];
                    var closest = -1;
                    for( i=0;i<$scope.markers.length; i++ ) {
                        var mlat = $scope.markers[i].position.lat();
                        var mlng = $scope.markers[i].position.lng();
                        var dLat  = rad(mlat - lat);
                        var dLong = rad(mlng - lng);
                        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                            Math.cos(rad(lat)) * Math.cos(rad(lat)) * Math.sin(dLong/2) * Math.sin(dLong/2);
                        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        var d = R * c;
                        distances[i] = d;
                        if ( closest == -1 || d < distances[closest] ) {
                            closest = i;
                        }
                    }

                    console.log($scope.markers,$scope.markers[closest].title);
                    $scope.user.service = $scope.markers[closest].service;
                    setTimeout(function() {
                    	$scope.$apply();
                    }, 0);
    			},
    			function(errGeolocation){
    				if(errGeolocation.code == 1){
    					siteFactory.toast("Geolocalización bloqueada por usuario");
    				}
    				else {
    					siteFactory.toast("Error con la geolocalización: '" + errGeolocation.message + "'");
    				}
    			}
    		);
    	}
    	else {
		  console.log('Geolocation is not supported for this Browser/OS.');
		}
    };

    function createFilterFor(query) {

      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(service) {
        return (service.name.toLowerCase().indexOf(lowercaseQuery) > -1);
      };

    }

	$scope.querySearch = function(query){
		return $scope.services.filter(createFilterFor(query));
	};

	$scope.canSave = function(){
		return $scope.user.name && $scope.user.idType && $scope.user.idValue && $scope.user.mail && $scope.user.service;
	};

	$scope.setResponse = function(res){
		$scope.response = res;
	}

	$scope.signup = function(){
		console.log("user",$scope.user)
		$http({method: "POST", url: 'user', data: {user: $scope.user, response: $scope.response}}).then(
			function(responseOK){
				$state.go('home');
				siteFactory.toast("Registro en proceso. Revise su email para confirmar");
			},
			function(responseError){
				console.log("Response Error: ", responseError);
				siteFactory.toast(responseError.data);
			}
		);
	}
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
