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
const config = require('../config/config');

mongoose.Promise = global.Promise;
mongoose.connect(config.database, function (err) {
    if (err) {
        console.error('database.js - cannot connect database - ' + err);
    } else {
        console.log('database.js - Database connected');
    }
});

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


module.exports = {
    mongoose: mongoose,
    Gallery: Gallery,
    Photo: Photo
};