var app = angular.module('cpNgTemplate', []);

app.config(function() {

});

app.factory('dataService', ['$q', '$http', function($q, $http) {

    var someDataURL = '/getMeData';

    var getImage = function() {
        return $http.get('/image')
    }

    var someMockService = function() {
        return $q.when({
            "a": 1
        });
    };


    var someRealService = function() {
        return $http.get(someDataURL);
    };

    return {
        someRealService: someRealService,
        someMockService: someMockService,
        getImage: getImage
    };
}]);


app.controller('AppCtrl', ['$scope', '$interval', 'dataService',
    function($scope, $interval, dataService) {

        dataService.getImage()
            .then(function(response) {
                $scope.imageData = response.data;
            });



    }
]);
