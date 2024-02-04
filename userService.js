const mongoose = require('mongoose');

let mongoDBConnectionString = process.env.MONGO_URL;

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
        db = mongoose.createConnection(mongoDBConnectionString);

        db.on('error', err => {
            reject(err);
        });

        db.once('open', () => {
            console.log("Connected to DB instance.")
            resolve();
        });
    });
};
