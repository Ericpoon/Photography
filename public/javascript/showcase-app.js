const app = angular.module('showcaseApp', []);

app.controller('showcaseController', function ($scope, $http) {
    $scope.isGalleryLoading = true;
    $scope.isShowWelcome = true;
    $scope.isBigImageLoading = false;
    $scope.isShowGallery = false;
    $scope.isShowAbout = false;
    function getAllPhotos() {
        $http.get('/db/getalltn').then(function okay(response) {
            $scope.photos = response.data;
            $scope.isGalleryLoading = false;
        }, function error(response) {

        })
    }

    getAllPhotos();

    $scope.showInfo = function (id) {
        var elem = angular.element(document.getElementsByClassName(id));
        elem.removeClass('hideInfo');
        elem.addClass('showInfo');
    };

    $scope.hideInfo = function (id) {
        var elem = angular.element(document.getElementsByClassName(id));
        elem.removeClass('showInfo');
        elem.addClass('hideInfo');
    };

    $scope.showBigImage = function (id) {
        $scope.bigPhoto = null; // TODO: maybe can show thumbnail first and load image, just like Weibo
        $scope.isShowWelcome = false;
        $scope.isShowGallery = false;
        $scope.isShowAbout = false;
        $scope.isShowLargePhoto = true;
        $scope.isBigImageLoading = true;
        $http.get('/db/getlarge/' + id).then(function okay(response) {
            $scope.bigPhoto = response.data;
            $scope.isBigImageLoading = false;
            $scope.isFirstPhoto = $scope.bigPhoto.prev == 'null';
            $scope.isLastPhoto = $scope.bigPhoto.next == 'null';
        }, function error(response) {
        });
    };

    $scope.showGallery = function () {
        console.log("show gallery");
        $scope.isShowGallery = true;
        $scope.isShowLargePhoto = false;
        $scope.isShowWelcome = false;
        $scope.isShowAbout = false;
        var elem = angular.element(document.getElementById('photography-option'));
        elem.addClass('selected');
        elem.removeClass('not-selected');
        elem = angular.element(document.getElementById('home-option'));
        elem.removeClass('selected');
        elem.addClass('not-selected');
        elem = angular.element(document.getElementById('about-option'));
        elem.removeClass('selected');
        elem.addClass('not-selected');
    };

    $scope.showWelcome = function () {
        console.log("show welcome");
        $scope.isShowWelcome = true;
        $scope.isShowGallery = false;
        $scope.isShowLargePhoto = false;
        $scope.isShowAbout = false;
        var elem = angular.element(document.getElementById('home-option'));
        elem.addClass('selected');
        elem.removeClass('not-selected');
        elem = angular.element(document.getElementById('photography-option'));
        elem.removeClass('selected');
        elem.addClass('not-selected');
        elem = angular.element(document.getElementById('about-option'));
        elem.removeClass('selected');
        elem.addClass('not-selected');
    };

    $scope.showAbout = function () {
        console.log("show about");
        $scope.isShowAbout = true;
        $scope.isShowWelcome = false;
        $scope.isShowGallery = false;
        $scope.isShowLargePhoto = false;
        var elem = angular.element(document.getElementById('about-option'));
        elem.addClass('selected');
        elem.removeClass('not-selected');
        elem = angular.element(document.getElementById('photography-option'));
        elem.removeClass('selected');
        elem.addClass('not-selected');
        elem = angular.element(document.getElementById('home-option'));
        elem.removeClass('selected');
        elem.addClass('not-selected');
    };

    $scope.showPrev = function () {
        var prev = $scope.bigPhoto.prev;
        if (prev != 'null') {
            $scope.bigPhoto = null;
            $scope.showBigImage(prev);
        }
    };

    $scope.showNext = function () {
        var next = $scope.bigPhoto.next;
        if (next != 'null') {
            $scope.bigPhoto = null;
            $scope.showBigImage(next);
        }
    };

    $scope.keyPressedOnBigPhotoContainer = function ($event) {
        console.log("Key Pressed");
        var keyCode = $event.keyCode;
        if (keyCode === 13 || 27) {
            $scope.showGallery();
        }
    };

});

app.directive('welcome', function () {
    function link() {

    }

    return {
        restrict: 'E',
        link: link,
        templateUrl: '/public/templates/welcome.html'
    }
});

app.directive('about', function () {
    function link() {

    }

    return {
        restrict: 'E',
        link: link,
        templateUrl: '/public/templates/about.html'
    }

});