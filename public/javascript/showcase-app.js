const app = angular.module('showcaseApp', []);

var PAGE = {
    WELCOME: '_welcome_',
    GALLERY: '_gallery_',
    ABOUT: '_about_',
    LARGE: '_large'
};

app.controller('showcaseController', function ($scope, $http) {
    $scope.isGalleryLoaded = false;
    $scope.isBigImageLoading = false;

    function getAllPhotos() {
        $http.get('/db/getallid').then(
            function okay(response) {
                $scope.photos = response.data;
                $scope.isGalleryLoaded = true;
                for (var i = 0; i < $scope.photos.length; i++) {
                    $scope.photos[i].photoData = '/public/images/loading.gif';
                    helper(i);
                }
                function helper(i) {
                    $http.get('/db/getthumb/' + $scope.photos[i]._id, {cache: true}).then(function okay(response) {
                        var blob = dataURItoBlob(response.data.photoData);
                        response.data.index = $scope.photos[i].index;
                        response.data.photoData = window.URL.createObjectURL(blob);
                        $scope.photos[i] = response.data;
                        // $scope.photos[i].photoData = response.data.photoData;
                    }, function error(response) {
                    });
                }

            },
            function error(response) {
                $scope.isGalleryLoaded = true;
                console.log(response.error);
            }
        );
    }

    function showPage(name) {
        $scope.isShowGallery = false;
        $scope.isShowLargePhoto = false;
        $scope.isShowWelcome = false;
        $scope.isShowAbout = false;
        switch (name) {
            case PAGE.WELCOME:
                $scope.isShowWelcome = true;
                break;
            case PAGE.GALLERY:
                $scope.isShowGallery = true;
                break;
            case PAGE.ABOUT:
                $scope.isShowAbout = true;
                break;
            case PAGE.LARGE:
                $scope.isShowLargePhoto = true;
            default:
                console.log('showcase-app.js - ERROR - NO PAGE TO SHOW');
                break;
        }
    }

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
        showPage(PAGE.LARGE);
        $scope.bigPhoto = null; // TODO: maybe can show thumbnail first and load image, just like Weibo
        $scope.isBigImageLoading = true;
        $http.get('/db/getlarge/' + id).then(function okay(response) {
            var blob = dataURItoBlob(response.data.photoData);
            response.data.photoData = window.URL.createObjectURL(blob);
            $scope.bigPhoto = response.data;
            //
            $scope.isBigImageLoading = false;
            $scope.isFirstPhoto = $scope.bigPhoto.prev == 'null';
            $scope.isLastPhoto = $scope.bigPhoto.next == 'null';
        }, function error(response) {
        });
    };

    $scope.showGallery = function () {
        if (!$scope.isGalleryLoaded) {
            getAllPhotos();
        }
        showPage(PAGE.GALLERY);
    };

    $scope.showWelcome = function () {
        $scope.isGalleryLoaded = false;
        showPage(PAGE.WELCOME);
    };

    $scope.showAbout = function () {
        showPage(PAGE.ABOUT);
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

    $scope.showWelcome();

});

app.directive('welcome', function () {
    return {
        restrict: 'E',
        templateUrl: '/public/templates/welcome.html'
    }
});

app.directive('about', function () {
    return {
        restrict: 'E',
        templateUrl: '/public/templates/about.html'
    }
});

app.directive('navigation', function () {
    return {
        restrict: 'E',
        templateUrl: '/public/templates/navigation.html'
    }
});

app.directive('footer', function () {
    return {
        restrict: 'E',
        templateUrl: '/public/templates/footer.html'
    }
});

app.directive('gallery', function () {
    return {
        restrict: 'E',
        templateUrl: '/public/templates/gallery.html'
    }
});

app.directive('largeDisplay', function () {
    return {
        restrict: 'E',
        templateUrl: '/public/templates/large-display.html'
    }
});

// frontend supported methods
function dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var arrayBuffer = new ArrayBuffer(byteString.length);
    var _ia = new Uint8Array(arrayBuffer);
    for (var i = 0; i < byteString.length; i++) {
        _ia[i] = byteString.charCodeAt(i);
    }

    var dataView = new DataView(arrayBuffer);
    var blob = new Blob([dataView.buffer], {type: mimeString});
    return blob;
}
