const app = angular.module('editorApp', []);

app.controller('editorController', function ($scope, $http) {

    var fileToUpload = null;

    $scope.addPhoto = function () {
        var reader = new FileReader();
        reader.onload = function (event) {
            $scope.message = 'Submitting...';
            var newData = {"photoData": reader.result, "title": $scope.title, "description": $scope.description, "gallery": 'default'};
            console.log(newData);
            // post the data to the server
            $http.post("/db/addnew", newData).then(function okay(response) {
                $scope.message = response.data;
            }, function error(response) {
                $scope.message = 'Server Connection Error';
            });
        };
        if (fileToUpload) {
            reader.readAsDataURL(fileToUpload);
        }
    };

    $scope.getAll = function () {
        console.log('clear display');
        $scope.photos = [];
        $http.get("/db/getalltn").then(function okay(response) {
            console.log('getting');
            $scope.photos = response.data;
        }, function error(response) {
            console.log('error');
        });
    };

    $scope.deletePhoto = function (id) {
        $http.delete('/db/delete/' + id).then(function okay(response) {
            console.log(response);
        }, function error(response) {
        });
    };

    $scope.chooseFile = function (f) {
        fileToUpload = f;
    };
});

app.directive('myNgChooseFile', function ($parse) {
    function linkFn(scope, elem, attrs) {
        var fileHandler = $parse(attrs.myNgChooseFile);
        elem.on('change', function (event) {
            fileHandler(scope, {file: event.target.files[0]});
        });
    }

    return {
        link: linkFn
    }
});