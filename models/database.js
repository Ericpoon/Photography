/*  ********************  Style Guide  ********************
 *
 *  Error log style:
 *      console.error('<current javascript file name> - <error description> - <message>')
 *  Exception log style:
 *      console.log('<current javascript file name> - <exception description> - <message>')
 *  Error handling:
 *      1. log the error (see above, error log style)
 *      2. pass null value to the callback function
 *          (so the client, or frontend, knows that there's an error in backend)
 *  Variable naming:
 *      - for callbacks, name them as 'onAction' or 'onObject', e.g. onError, onSuccess, onGallery
 *      - always use Id/id instead of ID
 *      - always use Prev/prev instead of Previous/previous
 *  Method naming:
 *      - for private methods, prefix with '_', e,g, '_sortPhotos'
 *  Callback:
 *      - the first parameter of the callbacks must be errorMessage
 *      - either error or result must be null, they can't be both non-null
 *  Return value:
 *      - id getter returns undefined if error occurs, returns null if no error and returns id if exists
 * */

const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const fs = require('fs');
const when = require('when');
const config = require('../config/config');
const imageCompressor = require('./image-compressor');
const PHOTO_QUALITY = {
    ORIGINAL: '_ORIGINAL_',
    LARGE: '_LARGE_',
    THUMBNAIL: '_THUMBNAIL_'
};
const TEMP_PHOTO_FOLDER_PATH = './temp_photos';
const DEFAULT_GALLERY_NAME = 'default';

mongoose.Promise = global.Promise;
mongoose.connect(config.database, function (err) {
    if (err) {
        console.error('database.js - cannot connect database - ' + err);
    } else {
        console.log('database.js - Database connected');
    }
});

const gfs = new Grid(mongoose.connection.db, mongoose.mongo);

const gallerySchema = mongoose.Schema({
    name: {type: String, unique: true},
    description: String,
    head: String,
    tail: String,
});
const photoSchema = mongoose.Schema({
    thumbnail: String,
    large: String,
    original: String,
    title: String,
    description: String,
    gallery: String,
    prev: String,
    next: String,
});
const Gallery = mongoose.model('galleries', gallerySchema);
const Photo = mongoose.model('photos', photoSchema);


// Getter
function getAllGalleries(onAllGalleries) {
    Gallery.find({}, {}, function (err, docs) {
        if (err) {
            console.error('database.js - error when finding all galleries - ' + err);
            onAllGalleries('An error occurred when trying to get all galleries.', null);
            return;
        }
        if (docs) {
            onAllGalleries(null, docs);
        } else {
            onAllGalleries('Unknown error.', null);
        }
    })
}
function getGalleryByName(gname, onGallery) {
    Gallery.find({'name': gname}, {}, function (err, docs) {
        if (err) {
            console.error('database.js - error when finding a gallery by name - ' + err);
            onGallery(err, null);
            return;
        }
        if (docs.length == 0 || !docs) {
            console.log('database.js - gallery not exists - ' + gname);
            onGallery('Gallery not exists - ' + gname, null);
            return;
        }
        onGallery(null, docs[0]);
    });
}
function getFirstPhotoId(gname, onFirstPhotoId) {
    function onGallery(err, gallery) {
        if (err) {
            onFirstPhotoId(err);
        } else {
            onFirstPhotoId(null, gallery.head);
        }
    }

    getGalleryByName(gname, onGallery);
}
function getLastPhotoId(gname, onLastPhotoId) {
    function onGallery(err, gallery) {
        if (gallery) {
            onLastPhotoId(err, gallery.tail);
        } else {
            onLastPhotoId(err, null);
        }
    }

    getGalleryByName(gname, onGallery);
}
function getAllPhotos(gname, onAllPhotos) {
    Photo.find({'gallery': gname}, {}, function (err, docs) {
        if (err) {
            console.error('database.js - error when finding all photos - ' + err);
            onAllPhotos('An error occurred when trying to get all photos.', null);
            return;
        }
        if (docs) {
            // TODO: should sort photos
            onAllPhotos(null, docs);
        } else {
            onAllPhotos('Unknown error.', null);
        }
    });
}
function getAllPhotosSorted(gname, onAllPhotosSorted) {
    getAllPhotos(gname, function (err, docs) {
        if (err) {
            onAllPhotosSorted(err);
            return;
        }
        _getPhotoSequence(gname, function (err, sequence) {
            if (err) {
                onAllPhotosSorted(err);
                return;
            }
            for (var i = 0; i < docs.length; i++) {
                var target = sequence[i];
                for (var j = i; j < docs.length; j++) {
                    if (docs[j]._id == target) {
                        // swap docs[i] and docs[j]
                        var temp = docs[i];
                        docs[i] = docs[j];
                        docs[j] = temp;
                        break;
                    }
                }
            }
            for (var i = 0; i < docs.length; i++) {
                docs[i]._doc.index = i;
            }
            onAllPhotosSorted(null, docs);
        })
    });
}
function getPhotoById(pid, onPhoto) {
    Photo.find({'_id': pid}, {}, function (err, docs) {
        if (err) {
            console.error('database.js - error when finding a photo by id - ' + err);
            onPhoto('An error occurred when trying to get photo by id - ' + pid, null);
            return;
        }
        if (docs.length == 0 || !docs) {
            console.log('database.js - photo not exists - ' + pid);
            onPhoto('Photo not exists - ' + pid, null);
            return;
        }
        onPhoto(null, docs[0]);
    })
}
function getPhotoIdAtIndex(gname, index, onPhoto) {
    getFirstPhotoId(gname, function (err, id) {
        if (err) {
            onPhoto(err);
            return;
        }
        if (index >= 0) {
            helper(id, index, 0, onPhoto);
        } else {
            onPhoto('Index should be larger than or equal to 0.');
        }
    });

    function helper(id, index, counter, onCompletion) {
        if (counter < index) {
            if (id == null) {
                onCompletion('Index out of range.');
                return;
            }
            getNextPhotoId(id, function (err, nextId) {
                if (err) {
                    onCompletion(err);
                    return;
                }
                helper(nextId, index, counter + 1, onCompletion);
            });
        } else {
            onCompletion(null, id);
        }
    }
}
function getNextPhotoId(pid, onNextPhotoId) {
    function onCurrentPhoto(err, photo) {
        if (photo) {
            onNextPhotoId(err, photo.next);
        } else {
            onNextPhotoId(err, null);
        }
    }

    getPhotoById(pid, onCurrentPhoto);
}
function getPrevPhotoId(pid, onPrevPhotoId) {
    function onCurrentPhoto(err, photo) {
        if (photo) {
            onPrevPhotoId(err, photo.prev);
        } else {
            onPrevPhotoId(err, null);
        }
    }

    getPhotoById(pid, onCurrentPhoto);
}
function getPhotoDataById(pid, quality, onPhotoData) {
    function onPhoto(err, photo) {
        if (photo) {
            switch (quality) {
                case PHOTO_QUALITY.THUMBNAIL:
                    getDataHelper(photo.thumbnail);
                    break;
                case PHOTO_QUALITY.LARGE:
                    getDataHelper(photo.large);
                    break;
                case PHOTO_QUALITY.ORIGINAL:
                    getDataHelper(photo.original);
                    break;
                default:
                    console.error('database.js - invalid quality input');
                    onPhotoData('Invalid quality input.', null);
                    break;
            }
        } else {
            console.error('database.js - error at getPhotoDataById()\n\tid:' + pid + '\n\terr:' + err);
            onPhotoData(err, null);
        }
    }

    function getDataHelper(id) {
        if (id) {
            var readStreamFromDatabase = gfs.createReadStream({'_id': id});
            var fileName = Math.random();
            var filePath = TEMP_PHOTO_FOLDER_PATH + '/' + fileName;
            var writeStreamToLocal = null; // use a write stream to write the file in local storage from the database
            var extension = 'jpeg';
            console.log('DEBUG - start gfs.findOne - ' + filePath + ' - #' + id);
            gfs.findOne({_id: id}, function (err, file) {
                if (err) {
                    console.log('DEBUG - ERR: ' + err);
                    // TODO: handle error
                    return;
                }
                if (file) {
                    console.log('DEBUG - FILE GOOD');
                    writeStreamToLocal = fs.createWriteStream(filePath);
                    console.log('DEBUG - 1');
                    writeStreamToLocal.on('close', function() {
                        console.log('DEBUG - write stream to local is closing');
                        helper();
                    });
                    console.log('DEBUG - 2');
                    extension = file.contentType.replace('image/', '');
                    console.log('DEBUG - 3');
                    readStreamFromDatabase.pipe(writeStreamToLocal);
                    console.log('DEBUG - 4');
                } else {
                    console.log('DEBUG - FILE IS NULL');
                    // TODO: handle error
                    return;
                }
            });
            function helper() {
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        console.log('DEBUG - fs.readFile err ' + err);
                        return;
                    }
                    var b64str = new Buffer(data).toString('base64');
                    b64str = 'data:image/' + extension + ';base64,' + b64str;
                    fs.unlink(filePath);
                    onPhotoData(null, b64str);
                    console.log('DEBUG - done');
                });
            }
        } else {
            console.error('database.js - id is null, unknown why, cannot get photo data');
        }
    }

    getPhotoById(pid, onPhoto)
}
function getAllPhotosWithData(gname, quality, onAllPhotoWithData) {
    if (!_isValidQualityInput(quality)) {
        onAllPhotoWithData('Invalid quality input.');
        return;
    }
    getAllPhotos(gname, function (err, docs) {
        if (err) {
            onAllPhotoWithData(err);
            return;
        }
        helper(docs, 0, onAllPhotoWithData);
        function helper(docs, index, onCompletion) {
            if (index < docs.length) {
                getPhotoDataById(docs[index]._id, quality, function (err, data) {
                    docs[index].otherProps.photoData = data;
                    helper(docs, index + 1, onCompletion);
                });
            } else {
                onCompletion(null, docs);
            }
        }
    });
}
function getAllPhotosWithDataSorted(gname, quality, onAllPhotoWithDataSorted) {
    if (!_isValidQualityInput(quality)) {
        onAllPhotoWithDataSorted('Invalid quality input.');
        return;
    }
    getAllPhotosSorted(gname, function (err, docs) {
        if (err) {
            onAllPhotoWithDataSorted(err);
            return;
        }

        helper(docs, 0, onAllPhotoWithDataSorted);
        function helper(docs, index, onCompletion) {
            if (index < docs.length) {
                getPhotoDataById(docs[index]._id, quality, function (err, data) {
                    docs[index]._doc.photoData = data;
                    helper(docs, index + 1, onCompletion);
                });
            } else {
                onCompletion(null, docs);
            }
        }
    });
}
function getPhotoWithDataById(pid, quality, onPhotoWithData) {
    if (!_isValidQualityInput(quality)) {
        onPhotoWithData('Invalid quality input.');
        return;
    }
    getPhotoById(pid, function (err, doc) {
        if (err) {
            onPhotoWithData(err);
            return;
        }
        getPhotoDataById(pid, quality, function (err, data) {
            if (err) {
                onPhotoWithData(err);
                return;
            }
            doc._doc.photoData = data;
            onPhotoWithData(null, doc);
        });
    })
}
function _getPhotoSequence(gname, onSequence) {
    getGalleryByName(gname, function (err, galleryDoc) {
        if (err) {
            onSequence(err);
            return;
        }
        helper(galleryDoc.head, [], function (err, sequence) {
            onSequence(err, sequence);
        });
        function helper(currentId, sequence, onCompletion) {
            if (currentId) {
                sequence.push(currentId);
                getPhotoById(currentId, function (err, doc) {
                    if (err) {
                        onCompletion(err);
                        return;
                    }
                    helper(doc.next, sequence, onCompletion);
                });
            } else {
                onCompletion(null, sequence);
            }
        }
    })
}


// Creator
function createGallery(galleryDoc, onNewGallery) {
    if (!onNewGallery) {
        onNewGallery = function () {
        };
    }
    function onError(err) {
        onNewGallery(err, null);
    }

    function onExisted(gallery) {
        onNewGallery('Gallery ' + Gallery.name + ' already exists.', null);
    }

    function onNotExisted() {
        var newGallery = new Gallery({
            name: galleryDoc.name,
            description: galleryDoc.description,
            head: null,
            tail: null
        });
        newGallery.save(function (err, newDoc) {
            if (err) {
                onNewGallery(err, null);
            } else {
                console.log('database.js - New gallery created: ' + newDoc.name);
                onNewGallery(null, newDoc);
            }
        });
    }

    if (!galleryDoc.name || galleryDoc.name == '') {
        onNewGallery('Gallery name cannot be empty.', null);
        return;
    }

    isGalleryExisted(galleryDoc.name, onError, onExisted, onNotExisted);
}
function addNewPhoto(photoDoc, onNewPhoto) {
    var b64str = photoDoc.photoData;
    var contentType = b64str.substr(5, b64str.search(/;base64/) - 5);
    var extension = contentType.replace('image/', '');
    var random = Math.random(); // avoid name conflict
    var originalPhotoName = photoDoc.title + '_' + random + '_original' + '.' + extension;
    var originalPhotoPath = TEMP_PHOTO_FOLDER_PATH + '/' + originalPhotoName;
    var largePhotoName = photoDoc.title + '_' + random + '_large' + '.' + extension;
    var largePhotoPath = TEMP_PHOTO_FOLDER_PATH + '/' + largePhotoName;
    var thumbnailPhotoName = photoDoc.title + '_' + random + '_thumbnail' + '.' + extension;
    var thumbnailPhotoPath = TEMP_PHOTO_FOLDER_PATH + '/' + thumbnailPhotoName;
    var writeStreamOriginalToDatabase = gfs.createWriteStream({
        filename: originalPhotoName,
        content_type: contentType
    });
    var writeStreamLargeToDatabase = gfs.createWriteStream({
        filename: largePhotoName,
        content_type: contentType
    });
    var writeStreamThumbnailToDatabase = gfs.createWriteStream({
        filename: thumbnailPhotoName,
        content_type: contentType
    });
    var originalId, largeId, thumbnailId;

    if (contentType.search('image') == -1) {
        onNewPhoto('Invalid Image Format', null);
        return;
    }

    isGalleryExisted(photoDoc.gallery,
        function (err) {
            onNewPhoto(err, null);
        }, function () {
            save();
        }, function () {
            onNewPhoto('Gallery not exists. Cannot add new photo.', null);
        }
    );

    function save() {

        if (!fs.existsSync(TEMP_PHOTO_FOLDER_PATH)) {
            console.log('database.js - Rebuilding directory for temporary photo files');
            fs.mkdirSync(TEMP_PHOTO_FOLDER_PATH);
        }

        // write the base64 string to a file
        console.log('database.js - Writing base64 data to file');
        fs.writeFile(originalPhotoPath, b64str.replace(/^data:image\/.*;base64,/, ''), 'base64', function (err) {
            if (err) {
                console.error('database.js - Error when writing original photo data to local file');
                // TODO: handle error
                return;
            }
            fs.createReadStream(originalPhotoPath).pipe(writeStreamOriginalToDatabase);
        });

        // write the original image to database (grid fs)
        console.log('database.js - Writing original photo to database');

        var promises = [];
        var deferForLarge = when.defer();
        var deferForThumbnail = when.defer();
        promises.push(deferForLarge.promise);
        promises.push(deferForThumbnail.promise);
        writeStreamOriginalToDatabase.on('close', function (doc) {
            originalId = doc._id;
            makeAndStoreCompressedPhoto('large', originalPhotoPath, largePhotoPath, writeStreamLargeToDatabase,
                function onError() {
                    largeId = -1;
                    deferForLarge.resolve();
                }
            );
            makeAndStoreCompressedPhoto('thumbnail', originalPhotoPath, thumbnailPhotoPath, writeStreamThumbnailToDatabase,
                function onError() {
                    thumbnailId = -1;
                    deferForThumbnail.resolve();
                }
            );
        });
        writeStreamLargeToDatabase.on('close', function (doc) {
            largeId = doc._id;
            deferForLarge.resolve();
        });
        writeStreamThumbnailToDatabase.on('close', function (doc) {
            thumbnailId = doc._id;
            deferForThumbnail.resolve();
        });
        when.all(promises).then(function () {
            saveNewPhotoDocToDatabase();
            fs.unlink(originalPhotoPath);
            fs.unlink(largePhotoPath);
            fs.unlink(thumbnailPhotoPath);
        });
        function makeAndStoreCompressedPhoto(compressionRatio, originalPath, newPath, writeStreamToDatabase, onError) {
            console.log('database.js - Writing compressed (' + compressionRatio + ') photo to database');
            var thumbnailPromise = new Promise(function (resolve, reject) {
                imageCompressor.compress(originalPath, newPath, function (err, result) {
                    if (err) {
                        reject();
                    } else {
                        resolve();
                    }
                });
            });
            thumbnailPromise.then(
                function onFulfilled() {
                    fs.createReadStream(newPath).pipe(writeStreamToDatabase);
                },
                function onRejected() {
                    if (onError) {
                        // TODO: mark down the error, server should automatically retry to create thumbnail later
                        onError();
                    }
                }
            );
        }

        function saveNewPhotoDocToDatabase() {
            if (photoDoc.title == undefined) {
                photoDoc.title = 'no title';
            }

            if (photoDoc.description == undefined) {
                photoDoc.description = '';
            }
            // TODO: 
            if (photoDoc.gallery == undefined) {
                photoDoc.gallery = DEFAULT_GALLERY_NAME;
            }

            var newPhoto = new Photo({
                thumbnail: thumbnailId,
                large: largeId,
                original: originalId,
                title: photoDoc.title,
                description: photoDoc.description,
                gallery: photoDoc.gallery,
                prev: null,
                next: null
            });


            newPhoto.save(function (err, newDoc) {
                if (err) {
                    onNewPhoto(err);
                    // TODO: mark down err, either retry to store later or remove photo files already stored in grid fs
                } else {
                    _updateLinkedListAfterAddingPhotoToGallery(newDoc, function (err) {
                        getPhotoById(newDoc._id, onNewPhoto);
                        console.log('database.js - new photo successfully stored: ' + newDoc.title);
                    });

                }

            });
        }
    }

}
function insertNewPhotoAfterId(photoDoc, pid, onNewPhoto) {
    // TODO: gallery should be the same, change the parameters to ask client to input gallery and photo separately
    getLastPhotoId(photoDoc.gallery, function (err, lastId) {
        if (err) {
            return;
        }
        if (lastId == pid) {
            // simply add to the end
            addNewPhoto(photoDoc, onNewPhoto);
        } else {
            addNewPhoto(photoDoc, function (err, newPhoto) {
                if (err) {
                    onNewPhoto(err);
                    return;
                }
                getNextPhotoId(pid, function (err, next) {
                    var defer1 = when.defer();
                    var defer2 = when.defer();
                    var defer3 = when.defer();
                    var defer4 = when.defer();
                    var promises = [defer1.promise, defer2.promise, defer3.promise, defer4.promise];
                    when.all(promises).then(function () {
                        onNewPhoto(null, newPhoto);
                    });
                    _updateLinkedListAfterRemovingPhotoFromGallery(newPhoto, function (err) {
                        defer1.resolve();
                    });
                    Photo.update({_id: pid}, {$set: {next: newPhoto._id}}, function (err) {
                        if (!err) {
                            defer2.resolve();
                        }
                    });
                    Photo.update({_id: newPhoto._id}, {$set: {next: next, prev: pid}}, function (err) {
                        if (!err) {
                            newPhoto.next = next;
                            newPhoto.prev = pid;
                            defer3.resolve();
                        }
                    });
                    Photo.update({_id: next}, {$set: {prev: newPhoto._id}}, function (err) {
                        if (!err) {
                            defer4.resolve();
                        }
                    });
                });
            });
        }
    });
}
function insertNewPhotoBeforeId(photoDoc, pid, onNewPhoto) {
    getPrevPhotoId(pid, function (err, prevId) {
        if (err) {
            onNewPhoto(err);
            return;
        }
        if (prevId) {
            insertNewPhotoAfterId(photoDoc, prevId, onNewPhoto);
        } else {
            // inserting before the head
            getLastPhotoId(photoDoc.gallery, function (err, lastId) {
                addNewPhoto(photoDoc, function (err, newPhoto) {
                    if (err) {
                        onNewPhoto(err);
                        return;
                    }
                    var defer1 = when.defer();
                    var defer2 = when.defer();
                    var defer3 = when.defer();
                    var defer4 = when.defer();
                    var promises = [defer1.promise, defer2.promise, defer3.promise, defer4.promise];
                    when.all(promises).then(function () {
                        onNewPhoto(null, newPhoto);
                    });
                    Gallery.update({name: newPhoto.gallery}, {
                        $set: {
                            head: newPhoto._id,
                            tail: lastId
                        }
                    }, function (err) {
                        if (!err) defer1.resolve();
                    });
                    Photo.update({_id: pid}, {$set: {prev: newPhoto._id}}, function (err) {
                        if (!err) defer2.resolve();
                    });
                    Photo.update({_id: newPhoto._id}, {$set: {prev: null, next: pid}}, function (err) {
                        if (!err) {
                            newPhoto.prev = null;
                            newPhoto.next = pid;
                            defer3.resolve();
                        }
                    });
                    Photo.update({_id: lastId}, {$set: {next: null}}, function (err) {
                        if (!err) defer4.resolve();
                    });
                });
            });
        }
    });
}
function insertNewPhotoAtIndex(photoDoc, index, onNewPhoto) {
    getNumberOfPhotos(photoDoc.gallery, function (err, number) {
        if (index == number) {
            // add to the end
            addNewPhoto(photoDoc, onNewPhoto);
        } else {
            getPhotoIdAtIndex(photoDoc.gallery, index, function (err, id) {
                if (err) {
                    onNewPhoto(err);
                    return;
                }
                insertNewPhotoBeforeId(photoDoc, id, onNewPhoto);
            });
        }
    });

}


// Updater
function updateGalleryName(gname, newName, onCompletion) {
    if (newName && newName != '') {
        Gallery.update({'name': gname}, {$set: {'name': newName}}, function (err) {
            if (err) {
                onCompletion(err);
                return;
            }
            // also update all photos' reference
            Photo.update({'gallery': gname}, {$set: {'gallery': newName}}, function (err) {
                if (err) {
                    onCompletion(err);
                    // TODO: mark down err, undo or retry later
                    return;
                }
                onCompletion(null, {'oldName': gname, 'newName': newName});
            });
        });
    } else {
        onCompletion('Gallery name cannot be empty.', null);
    }
}
function updateGalleryDescription(gname, newDescription, onCompletion) {
    if (!newDescription) {
        newDescription = '';
    }
    Gallery.update({'name': gname}, {$set: {'description': newDescription}}, function (err) {
        if (err) {
            onCompletion(err);
        } else {
            onCompletion(null, {'galleryName': gname, 'newDescription': newDescription});
        }
    });
}
function updatePhotoTitle(pid, newTitle, onCompletion) {
    if (newTitle && newTitle != '') {
        Photo.update({'_id': pid}, {$set: {'title': newTitle}}, function (err) {
            if (err) {
                onCompletion(err);
            } else {
                onCompletion(null, {'_id': pid, 'newTitle': newTitle});
            }
        });
    } else {
        onCompletion('Photo title cannot be empty.', null);
    }
}
function updatePhotoDescription(pid, newDescription, onCompletion) {
    if (!newDescription) {
        newDescription = '';
    }
    Photo.update({'_id': pid}, {$set: {'description': newDescription}}, function (err) {
        if (err) {
            onCompletion(err);
        } else {
            onCompletion(null, {'_id': pid, 'newDescription': newDescription});
        }
    });
}
function movePhotoToGallery(pid, newGalleryName, onCompletion) {
    isGalleryExisted(newGalleryName,
        function (err) {
            onCompletion(err, null);
        },
        function (galleryDoc) {
            getPhotoById(pid, function (err, doc) {
                if (err) {
                    onCompletion(err);
                    return;
                }
                // update old gallery's linked list
                _updateLinkedListAfterRemovingPhotoFromGallery(doc);
                // update photo doc
                Photo.update({'_id': pid}, {
                    $set: {
                        'gallery': newGalleryName,
                        'prev': null,
                        'next': null
                    }
                }, function (err) {
                    if (err) {
                        // TODO: mark down err
                    }
                });
                doc._doc.gallery = newGalleryName;
                _updateLinkedListAfterAddingPhotoToGallery(doc, onCompletion);
            });
        },
        function () {
            onCompletion('Cannot move photo. Gallery not exists.');
        }
    );
}
function swapTwoPhotos(pid1, pid2, onCompletion) {
    if (pid1 == pid2) {
        onCompletion();
        return;
    }
    getPhotoById(pid1, function (err, doc1) {
        if (err) {
            onCompletion(err);
            return;
        }
        getPhotoById(pid2, function (err, doc2) {
            if (err) {
                onCompletion(err);
                return;
            }
            var prev1 = doc1.prev;
            var next1 = doc1.next;
            var prev2 = doc2.prev;
            var next2 = doc2.next;
            var gname = doc1.gallery;
            // TODO: make sure doc1.gallery == doc2.gallery;

            if (next1 == pid2) {
                // if the second photo is to the right of the first one (adjacent)
                Photo.update({_id: doc1._id}, {$set: {'prev': pid2, 'next': next2}}, function (err) {
                });
                Photo.update({_id: doc2._id}, {$set: {'prev': prev1, 'next': pid1}}, function (err) {
                });
                Photo.update({_id: prev1}, {$set: {'next': doc2._id}}, function (err) {
                });
                Photo.update({_id: next2}, {$set: {'prev': doc1._id}}, function (err) {
                });
            } else if (prev1 == pid2) {
                // if the first photo is to the right of the second one (adjacent)
                Photo.update({_id: doc1._id}, {$set: {'prev': prev2, 'next': pid2}}, function (err) {
                });
                Photo.update({_id: doc2._id}, {$set: {'prev': pid1, 'next': next1}}, function (err) {
                });
                Photo.update({_id: prev2}, {$set: {'next': doc1._id}}, function (err) {
                });
                Photo.update({_id: next1}, {$set: {'prev': doc2._id}}, function (err) {
                });
            } else {
                Photo.update({_id: doc1._id}, {$set: {'prev': prev2, 'next': next2}}, function (err) {
                });
                Photo.update({_id: doc2._id}, {$set: {'prev': prev1, 'next': next1}}, function (err) {
                });
                Photo.update({_id: prev1}, {$set: {'next': doc2._id}}, function (err) {
                });
                Photo.update({_id: next1}, {$set: {'prev': doc2._id}}, function (err) {
                });
                Photo.update({_id: prev2}, {$set: {'next': doc1._id}}, function (err) {
                });
                Photo.update({_id: next2}, {$set: {'prev': doc1._id}}, function (err) {
                });
            }

            updateGalleryIfNeeded(onCompletion);

            function updateGalleryIfNeeded(onCompletion) {
                getFirstPhotoId(gname, function (err, firstId) {
                    if (err) {
                        //TODO:
                        return;
                    }
                    getLastPhotoId(gname, function (err, lastId) {
                        if (err) {
                            //TODO:
                            return;
                        }
                        var newHead = null;
                        var newTail = null;

                        var headDefer = when.defer();
                        var tailDefer = when.defer();
                        var promises = [];
                        promises.push(headDefer);
                        promises.push(tailDefer);
                        when.all(promises).then(function () {
                            onCompletion();
                        });


                        // update head
                        if (doc1._id.equals(firstId)) {
                            newHead = doc2._id;
                        } else if (doc2._id.equals(firstId)) {
                            newHead = doc1._id;
                        }
                        if (newHead) {
                            Gallery.update({name: gname}, {$set: {head: newHead}}, function (err) {
                                if (err) {
                                    onCompletion(err);
                                    return;
                                }
                                headDefer.resolve();
                            });
                        } else {
                            headDefer.resolve();
                        }

                        // update tail
                        if (doc1._id.equals(lastId)) {
                            newTail = doc2._id;
                        } else if (doc2._id.equals(lastId)) {
                            newTail = doc1._id;
                        }
                        if (newTail) {
                            Gallery.update({name: gname}, {$set: {tail: newTail}}, function (err) {
                                if (err) {
                                    onCompletion(err);
                                    return;
                                }
                                tailDefer.resolve();
                            });
                        } else {
                            tailDefer.resolve();
                        }


                    });
                });
            }
        });
    });
}
function reorderPhotos(gname, pidSequence, onCompletion) {
    getNumberOfPhotos(gname, function (err, num) {
        if (pidSequence.length == num) {
            reorder();
        } else {
            onCompletion('Length of the pid sequence and the number of photos does not match.');
            return;
        }
    });
    function reorder() {

        var head = pidSequence[0];
        var tail = pidSequence[pidSequence.length - 1];
        var promises = [];
        var defers = [];
        for (var i = 0; i < pidSequence.length; i++) {
            defers.push(when.defer());
            promises.push(defers[i].promise);
        }
        var deferGallery = when.defer();
        defers.push(deferGallery);
        promises.push(deferGallery.promise);
        Gallery.update({name: gname}, {$set: {head: head, tail: tail}}, function (err) {
            defers[pidSequence.length].resolve();
        });
        for (var i = 0; i < pidSequence.length; i++) {
            var prev = null;
            var next = null;
            if (i > 0) {
                prev = pidSequence[i - 1];
            }
            if (i < pidSequence.length - 1) {
                next = pidSequence[i + 1];
            }
            updateHelper(i); // Avoid capturing wrong variable, remember the scoping of Javascript
        }
        function updateHelper(i) {
            Photo.update({_id: pidSequence[i]}, {prev: prev, next: next}, function (err) {
                defers[i].resolve();
            });
        }

        when.all(promises).then(function () {
            onCompletion();
        });
    }
}
function changePhotoImage(pid, newPhotoData, onCompletion) {
// will be supported in next version
}


// Remover
function removePhotoById(pid, onRemovedPhoto) {
    getPhotoById(pid, function (err, photoDoc) {
        if (err) {
            onRemovedPhoto(err);
            return;
        }

        // update previous photo, next photo and gallery (maintain the doubly linked list)
        _updateLinkedListAfterRemovingPhotoFromGallery(photoDoc);

        // remove photo document
        Photo.remove({'_id': pid}, function (err) {
            if (err) {
                // TODO: mark down err, handle later}
                return;
            }
        });

        // remove files in Grid FS
        var fileIds = [];
        fileIds.push(photoDoc.original);
        fileIds.push(photoDoc.large);
        fileIds.push(photoDoc.thumbnail);
        fileIds.map(function (id) {
            _removeGridFileById(id, function (err) {
                if (err) {
                    // TODO: mark down err, handle later
                    return;
                }
            });
        });
        onRemovedPhoto(null, photoDoc);
        console.log('database.js - Photo removed: ' + pid);
    });
}
function removeGalleryByName(gname, onRemovedGallery) {
    isGalleryEmpty(gname,
        function onError(err) {
            onRemovedGallery(err);
        },
        function onTrue() {
            Gallery.remove({'name': gname}, function (err) {
                if (err) {
                    onRemovedGallery(err);
                    return;
                }
                onRemovedGallery(null, gname);
            })
        },
        function onFalse() {
            onRemovedGallery('Cannot remove a non-empty gallery. Empty gallery first.');
        }
    );
}
function emptyGallery(gname, onCompletion) {
    getNumberOfPhotos(gname, function (err, number) {
        if (err) {
            onCompletion(err);
            return;
        }
        remove(gname, number);
    });
    function remove(gname, numberOfPhotos) {
        Photo.remove({'gallery': gname}, function (err) {
            if (err) {
                onCompletion(err);
                return;
            }
            Gallery.update({'name': gname}, {$set: {'head': null, 'tail': null}}, function (err) {
                if (err) {
                    onCompletion(err);
                    return;
                }
                console.log('database.js - gallery is empty now');
                onCompletion(null, {'gallery': gname, 'total': numberOfPhotos});
            });
        })
    }

}
function _removeGridFileById(fid, onCompletion) {
    gfs.remove({'_id': fid}, function (err) {
        if (err) {
            onCompletion(err);
        }
        onCompletion(null, fid);
    })
}


// Checker
function isGalleryExisted(gname, onError, onExisted, onNotExisted) {
    Gallery.find({'name': gname}, {}, function (err, docs) {
        if (err) {
            console.error('database.js - error when finding a gallery by name - ' + err);
            if (onError) {
                onError(err);
            }
            return;
        }
        if (docs.length == 0 || !docs) {
            if (onNotExisted) {
                onNotExisted();
            }
        } else {
            if (onExisted) {
                onExisted(docs[0]);
            }
        }
    });
}
function isPhotoExisted(pid, onError, onExisted, onNotExisted) {
    Photo.find({'_id': pid}, {}, function (err, docs) {
        if (err) {
            console.error('database.js - error when finding a photo by id - ' + err);
            if (onError) {
                onError(err);
            }
            return;
        }
        if (docs.length == 0 || !docs) {
            if (onNotExisted) {
                onNotExisted();
            }
        } else {
            if (onExisted) {
                onExisted(docs[0]);
            }
        }
    });
}
function isFirstPhoto(pid, onError, onTrue, onFalse) {
    getPhotoById(pid, function (err, photoDoc) {
        if (err) {
            if (onError) {
                onError(err);
            }
            return;
        }
        var gname = photoDoc.gallery;
        getFirstPhotoId(gname, function (err, firstId) {
            if (err) {
                if (onError) {
                    onError(err);
                }
                return;
            }

            if (pid == firstId) {
                if (onTrue) {
                    onTrue();
                }
            } else {
                if (onFalse) {
                    onFalse();
                }
            }

        });
    });
}
function isLastPhoto(pid, onError, onTrue, onFalse) {
    getPhotoById(pid, function (err, photoDoc) {
        if (err) {
            if (onError) {
                onError(err);
            }
            return;
        }
        var gname = photoDoc.gallery;
        getLastPhotoId(gname, function (err, lastId) {
            if (err) {
                if (onError) {
                    onError(err);
                }
                return;
            }

            if (pid == lastId) {
                if (onTrue) {
                    onTrue();
                }
            } else {
                if (onFalse) {
                    onFalse();
                }
            }

        });
    });
}
function isGalleryEmpty(gname, onError, onTrue, onFalse, f) {
    getGalleryByName(gname, function (err, galleryDoc) {
        if (err) {
            if (onError) {
                onError(err);
            }
            return;
        }
        if (galleryDoc.head == null && galleryDoc.tail == null) {
            if (onTrue) {
                onTrue(galleryDoc);
            }
        } else {
            if (onFalse) {
                onFalse(galleryDoc);
            }
        }
    })
}
function _isValidQualityInput(quality) {
    if (quality != PHOTO_QUALITY.ORIGINAL && quality != PHOTO_QUALITY.LARGE && quality != PHOTO_QUALITY.THUMBNAIL) {
        return false;
    } else {
        return true;
    }
}


// MetaData Getter
function getNumberOfPhotos(gname, onCompletion) {
    getAllPhotos(gname, function (err, photoDocs) {
        if (err) {
            onCompletion(err);
            return;
        }
        onCompletion(null, photoDocs.length);
    });
}
function getNumberOfGalleries(onCompletion) {
    Gallery.find({}, {}, function (err, docs) {
        if (err) {
            onCompletion(err);
            return;
        }
        onCompletion(null, docs.length);
    });
}
function getPhotoIndex(pid, onCompletion) {
    getGalleryOfPhoto(pid, function (err, gname) {
        if (err) {
            onCompletion(err);
            return;
        }
        getFirstPhotoId(gname, function (err, firstPid) {
            if (err) {
                onCompletion(err);
                return;
            }

            function helper(currentId, endId, count, onFound) {
                getNextPhotoId(currentId, function (err, nextId) {
                    if (err) {
                        onFound(err);
                        return;
                    }
                    if (nextId != endId) {
                        helper(nextId, endId, count + 1, onFound);
                    } else {
                        onFound(null, count);
                    }
                });
            }

            if (pid == firstPid) {
                onCompletion(null, 0);
            } else {
                helper(firstPid, pid, 1, onCompletion);
            }
        });
    })
}
function getGalleryOfPhoto(pid, onCompletion) {
    getPhotoById(pid, function (err, photoDoc) {
        if (err) {
            onCompletion(err);
            return;
        }
        onCompletion(null, photoDoc.gallery);
    });
}


// Linked List Maintainer
function _updateLinkedListAfterRemovingPhotoFromGallery(photoDoc, onCompletion) {
    var prevId = photoDoc.prev;
    var nextId = photoDoc.next;
    var gname = photoDoc.gallery;

    var prevIdDefer = when.defer();
    var nextIdDefer = when.defer();
    var promises = [];
    promises.push(prevIdDefer.promise);
    promises.push(nextIdDefer.promise);
    when.all(promises).then(onCompletion);

    if (prevId) {
        Photo.update({'_id': prevId}, {$set: {'next': nextId}}, function (err) {
            if (err) {
                return;
            }
            prevIdDefer.resolve();
        })
    } else {
        // if prevId is null, then the removed photo was the first photo in gallery
        // we should update the head of the gallery
        Gallery.update({'name': gname}, {$set: {'head': nextId}}, function (err) {
            if (err) {
                return;
            }
            prevIdDefer.resolve();
        });
    }
    if (nextId) {
        Photo.update({'_id': nextId}, {$set: {'prev': prevId}}, function (err) {
            if (err) {
                return;
            }
            nextIdDefer.resolve();
        })
    } else {
        // if nextId is null, then the removed photo was the last photo in gallery
        // we should update the tail of the gallery
        Gallery.update({'name': gname}, {$set: {'tail': prevId}}, function (err) {
            if (err) {
                return;
            }
            nextIdDefer.resolve();
        })
    }
}
function _updateLinkedListAfterAddingPhotoToGallery(photoDoc, onCompletion) {
    var gname = photoDoc.gallery;
    var pid = photoDoc._id;
    getLastPhotoId(gname, function (err, lastPid) {
        if (err) {
            return;
        }
        // update gallery first photo, if applied
        isGalleryEmpty(gname,
            function onError(err) {
                return;
            },
            function onTrue(doc) {
                Gallery.update({'name': gname}, {$set: {'head': pid, 'tail': pid}}, function (err) {
                    if (!err) {
                        updateHelper();
                    }
                });
            },
            function onFalse() {
                Gallery.update({'name': gname}, {$set: {'tail': pid}}, function (err) {
                    if (!err) {
                        updateHelper();
                    }
                });
            }
        );

        function updateHelper() {
            var lastPhotoDefer = when.defer();
            var currentPhotoDefer = when.defer();
            var promises = [];
            promises.push(lastPhotoDefer);
            promises.push(currentPhotoDefer);
            // update last photo's next, point it to the current photo
            Photo.update({'_id': lastPid}, {$set: {'next': pid}}, function (err) {
                if (!err) {
                    lastPhotoDefer.resolve();
                }
            });
            // update current photo's prev, point it to the original last photo
            Photo.update({'_id': pid}, {$set: {'next': null, 'prev': lastPid}}, function (err) {
                if (!err) {
                    lastPhotoDefer.resolve();
                }
            });
            when.all(promises).then(function () {
                onCompletion();
            });
        }
    });
}

module.exports = {
    PHOTO_QUALITY: PHOTO_QUALITY,
    // getter
    getAllGalleries: getAllGalleries,
    getGalleryByName: getGalleryByName,
    getFirstPhotoId: getFirstPhotoId,
    getLastPhotoId: getLastPhotoId,
    getAllPhotos: getAllPhotos,
    getAllPhotosSorted: getAllPhotosSorted,
    getPhotoById: getPhotoById,
    getPhotoIdAtIndex: getPhotoIdAtIndex,
    getNextPhotoId: getNextPhotoId,
    getPrevPhotoId: getPrevPhotoId,
    getPhotoDataById: getPhotoDataById,
    getPhotoWithDataById: getPhotoWithDataById,
    // creator
    createGallery: createGallery,
    addNewPhoto: addNewPhoto,
    insertNewPhotoBeforeId: insertNewPhotoBeforeId,
    insertNewPhotoAfterId: insertNewPhotoAfterId,
    insertNewPhotoAtIndex: insertNewPhotoAtIndex,
    getAllPhotoWithData: getAllPhotosWithData,
    getAllPhotoWithDataSorted: getAllPhotosWithDataSorted,
    // updater
    updateGalleryName: updateGalleryName,
    updateGalleryDescription: updateGalleryDescription,
    updatePhotoTitle: updatePhotoTitle,
    updatePhotoDescription: updatePhotoDescription,
    movePhotoToGallery: movePhotoToGallery,
    // changePhotoImage: changePhotoImage,
    reorderPhotos: reorderPhotos,
    swapTwoPhotos: swapTwoPhotos,
    // remover
    removePhotoById: removePhotoById,
    removeGalleryByName: removeGalleryByName,
    emptyGallery: emptyGallery,
    // checker
    isGalleryExisted: isGalleryExisted,
    isPhotoExisted: isPhotoExisted,
    isFirstPhoto: isFirstPhoto,
    isLastPhoto: isLastPhoto,
    isGalleryEmpty: isGalleryEmpty,
    // metadata getter
    getNumberOfPhotos: getNumberOfPhotos,
    getNumberOfGalleries: getNumberOfGalleries,
    getPhotoIndex: getPhotoIndex,
    getGalleryOfPhoto: getGalleryOfPhoto
};