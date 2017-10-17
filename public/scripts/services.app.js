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
        controller: function($scope, services, $http, siteFactory){
            console.log("services",services);
            $scope.services = services;
            $scope.newService = {};

            $scope.addSerive = function(){
                var params = {
                    method: 'post',
                    url: 'services/',
                    data: $scope.newService
                }
                $http(params).then(
                    function (data) {
                       if(data.data._id){
                            $scope.services.push(data.data);
                            setTimeout(function() {
                                $scope.$apply();
                            }, 0);
                        }
                        siteFactory.toast("Se guardo la información");
                    },
                    function(errorData){
                        console.log("errorData", errorData);
                        siteFactory.toast(errorData.data);
                    }
                );
            };
        }
    };

    $stateProvider.state(stateServices);

})
