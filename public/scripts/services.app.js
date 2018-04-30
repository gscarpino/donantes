angular.module( 'servicesModule', [ 'ngMaterial', 'ui.router' ] )

.config(function($stateProvider){

    var stateServices = {
        name: 'services',
        url: '/services',
        templateUrl: 'static/templates/services.html',
        resolve: {
            services:  function($http, siteFactory){
                return $http({method: 'get', url: 'services/'})
                       .then (function (data) {
                            console.log(data)
                           return data.data;
                       });
            }
        },
        controller: function($scope, services, $http, siteFactory, $rootScope){
            console.log("services",services);
            $scope.services = services;
            if(services && services.length > 0){
                var myLatlng = new google.maps.LatLng($rootScope.initialLocation.latitude, $rootScope.initialLocation.longitude);
                var mapOptions = {
                  zoom: 11,
                  center: myLatlng
                }
                var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
                var markers = [];
                for(var i = 0; i < services.length; i++){
                    if(services[i].location && services[i].location.latitude && services[i].location.longitude){
                        var marker = new google.maps.Marker({
                            map: map,
                            position: {lat: Number(services[i].location.latitude), lng: Number(services[i].location.longitude)},
                            title: services[i].name,
                            draggable: false
                        });
                        markers.push(marker);
                        marker.setMap(map);
                    }
                }

            }
        }
    };

    var stateService = {
        name: 'service',
        url: '/service/:_id?',
        templateUrl: 'static/templates/services.edit.html',
        resolve: {
            service:  function($stateParams, $http){
                if(!$stateParams._id){
                    return {name: '', description: '', mail: '', location: {}};
                }
                else{
                    return $http({method: 'GET', url: 'services/' + $stateParams._id})
                           .then (function (data) {
                               return data.data;
                           });
                }
            }
        },
        controller: function($scope, service, $http, siteFactory, $state, $mdDialog, $rootScope){
            console.log("service", service);
            $scope.service = service;

            if(service._id && service.location.latitude && service.location.longitude){
                var myLatlng = new google.maps.LatLng($rootScope.initialLocation.latitude, $rootScope.initialLocation.longitude);
                var mapOptions = {
                  zoom: 11,
                  center: myLatlng
                }
                var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
                var marker = new google.maps.Marker({
                    map: map,
                    position: {lat: Number(service.location.latitude), lng: Number(service.location.longitude)},
                    title: service.name,
                    draggable: false
                });
                marker.setMap(map);
            }


            $scope.canSave = function(){
                var pattern = /^[^\s@]+@[^\s@]+\.[^\s@\.,]{2,}$/;
                if(!pattern.test($scope.service.mail)){
                    $scope.formErrors = "El mail '" + $scope.service.mail + "' no es valido";
                    return false;
                }
                return true;
            };

            $scope.save = function(){
                var method = "PUT";
                if(!$scope.service._id){
                    method = "POST";
                }

                $http({method: method, url: 'service', data: $scope.service}).then(
                    function(responseOK){
                        if(responseOK.data._id){
                            $scope.service._id = responseOK.data._id;
                        }
                        $state.go($state.current, {_id: responseOK.data._id}, {reload: true});
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
                    .title('Eliminación de servicio')
                    .textContent('Todos los donantes van a dejar de pertenecer al servicio')
                    .ariaLabel('Confirmacion de eliminacion del servicio ' + $scope.service.name)
                    .targetEvent(ev)
                    .ok('OK')
                    .cancel('Cancelar');
                $mdDialog.show(confirm).then(function() {
                    $scope.confirmDelete();
                }, function() {

                });
            };

            $scope.confirmDelete = function(){
                if(!$scope.service._id){
                    return;
                }

                $http({method: 'DELETE', url: ('service/' + $scope.service._id)}).then(
                    function(responseOK){
                        $state.go('services');
                        siteFactory.toast("Se borro el servicio");
                    },
                    function(responseError){
                        console.log("Response Error: ", responseError);
                        siteFactory.toast("NO se pudo borrar el servicio");
                    }
                );

            };
        }
    };

    $stateProvider.state(stateServices);
    $stateProvider.state(stateService);

})
