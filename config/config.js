var port = null;

switch (process.env.NODE_ENV) {
    case 'dev':
        port = 3000;
        break;
    case 'prod':
        port = 80;
        break;
    default:
        port = 3000;
}

module.exports = {
    'database': 'mongodb://127.0.0.1/mydb',
    'port': port
};