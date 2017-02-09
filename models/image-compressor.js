/**
 * Created by Ericp on 2017-01-26.
 */
// const lwip = require('lwip');
// const fs = require('fs');

var sharp = require('sharp');
var fs = require('fs');
var config = require('../config/image-config');

function compress(path, newPath, quality, onCompletion) {
    var size = config.THUMB_SIZE;
    var q = config.THUMB_QUALITY;
    
    switch (quality.toLowerCase()) {
        case 'large':
            size = config.LARGE_SIZE;
            q = config.LARGE_QUALITY;
            break;
        case 'thumbnail':
            size = config.THUMB_SIZE;
            q = config.THUMB_QUALITY;
            break;
        default:
            break;
    }

    sharp(path).resize(size, size).min().sharpen().quality(q).toFile(newPath, function (err) {
        if (err) {
            console.error('image-compressor.js - Failed to compress - ' + err);
            onCompletion(err);
        }
        else {
            var size = fs.statSync(newPath).size / 1024;
            console.log('image-compressor.js - Image compressed successfully: ' + size.toFixed(2) + 'KiB');
            onCompletion();
        }
    });
}

module.exports = {
    compress: compress
};