/**
 * Created by Ericp on 2017-01-26.
 */
const lwip = require('lwip');
const fs = require('fs');

function compress(path, newImagePath, onCompletion) {
    lwip.open(path, function (openErr, image) {
        if (openErr) {
            console.error('imageCompressor.js - Failed to open file - ' + openErr);
            onCompletion(openErr);
            return;
        }
        console.log('imageCompressor.js - Original image opened successfully');

        var currentImageSize = fs.statSync(path).size / 1024;

        // if (currentImageSize < 512) {
        //
        // }

        var ratio = 1700 / currentImageSize;
        ratio = Math.min(ratio, 0.95);
        console.log('imageCompressor.js - Original image size: ' + currentImageSize.toFixed(2) + 'KB');

        image.batch().scale(ratio).writeFile(newImagePath, function (writeErr) {
            if (writeErr) {
                console.error('imageCompressor.js - Failed to write thumbnail to file - ' + writeErr);
                onCompletion(writeErr);
            } else {
                var sizeInBytes = fs.statSync(newImagePath).size.toFixed(2);
                console.log('imageCompressor.js - New image successfully created, size: ' + (sizeInBytes / 1024).toFixed(2) + 'KB');
                onCompletion(null, {path: newImagePath, size: sizeInBytes});
            }
        });
    });
}

module.exports = {
    compress: compress
};