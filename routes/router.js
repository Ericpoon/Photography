const router = require('express').Router();
const path = require('path');

const __viewdir = path.resolve(__dirname + '/../views');
const __modeldir = path.resolve(__dirname + '/../models');

const database = require(__modeldir + '/database.js');

const DEFAULT_GALLERY_NAME = 'default';
const DEMO_GALLERY_NAME = 'demo'; // for frontend development

// home page
router.get('/', function (request, response) {
    response.sendFile(__viewdir + '/index.html');
});

// editor
router.get('/editor', function (request, response) {
    response.sendFile(__viewdir + '/editor.html');
});


// for database operation
router.post('/db/addnew', function (request, response) {
    function sendBack(err, newPhotoDoc) {
        if (err) {
            response.status(500).send({'error': err});
        } else {
            response.send('OK - Photo added.');
        }
    }

    var photoDoc = request.body;
    photoDoc.gallery = DEMO_GALLERY_NAME;
    database.createGallery({
        'name': DEMO_GALLERY_NAME,
        'description': 'This gallery is automatically created.'
    }, function (err) {
        database.addNewPhoto(photoDoc, sendBack);
    });
});

router.get('/db/getalltn', function (request, response) {
    function sendBack(err, thumbnails) {
        if (err) {
            response.status(500).send({'error': err});
        } else {
            response.send(thumbnails);
        }
    }

    database.getAllPhotoWithDataSorted(DEMO_GALLERY_NAME, database.PHOTO_QUALITY.THUMBNAIL, sendBack);
});

router.get('/db/getallid', function (request, response) {
    function sendBack(err, ids) {
        if (err) {
            response.status(500).send({'error': err});
        } else {
            response.send(ids);
        }
    }

    database.getAllPhotoIdsSorted(DEMO_GALLERY_NAME, sendBack);
});

router.get('/db/getlarge/:id', function (request, response) {
    function sendBack(err, photo) {
        if (err) {
            response.status(500).send({'error': err});
        } else {
            response.send(photo);
        }
    }

    database.getPhotoWithDataById(request.params.id, database.PHOTO_QUALITY.LARGE, sendBack);
});

router.get('/db/getthumb/:id', function (request, response) {
    function sendBack(err, photo) {
        if (err) {
            response.status(500).send({'error': err});
        } else {
            response.send(photo);
        }
    }

    database.getPhotoWithDataById(request.params.id, database.PHOTO_QUALITY.THUMBNAIL, sendBack);
});

router.put('/db/update/:id', function (request, response) {

});

router.delete('/db/delete/:id', function (request, response) {
    function sendBack(err) {
        if (err) {
            response.status(500).send({'error': err});
        } else {
            response.send('OK - Photo removed.');
        }
    }

    database.removePhotoById(request.params.id, sendBack);
});


// 404 Not Found
router.get('*', function (request, response) {
    response.status(404).send({'error': '404 Not Found'});
});

module.exports = router;