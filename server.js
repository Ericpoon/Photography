// require Node JS modules
const express = require('express');
const bodyParser = require('body-parser');
// require local files
const config = require('./config/config.js');
const router = require('./routes/router.js');
// start using express()
const app = express();

// middlewares
app.use('/public', express.static(__dirname + '/public')); // to allow access to static files
app.use(bodyParser.urlencoded({extended: true, limit: '30mb'})); // to parse URL encoded data
app.use(bodyParser.json({limit: '30mb'})); // to parse JSON data
app.use('/', router); // to set up the router, should be done in the last step

// start listening
app.listen(config.port, function (error) {
    if (error) {
        console.log(error);
    } else {
        console.log('Listening to port #' + config.port + '...');
    }
});