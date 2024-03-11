const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

//Schemas
let userSchema = new Schema({
    email: {
        type: String,
        unique: true
    },
    fullName: String,
    password: String,
    phoneNumber: Number,
    admin: Boolean,
    authadmin: Boolean
}, { collection: 'users' });

let User;

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
        db = mongoose.createConnection(mongoDBConnectionString);

        db.on('error', err => {
            reject(err);
        });

        db.once('open', () => {
            console.log("Connected to DB instance.")
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

module.exports.registerRegUser = function (userData) {
    return new Promise(function (resolve, reject) {
        bcrypt.hash(userData.password, 10).then(hash => {

            userData.password = hash;
            
            User.create(
            {
                "email" : userData.email,
                "fullName" : userData.fullName,
                "password" : userData.password,
                "phoneNumber" : userData.phoneNumber,
                "admin" : false,
                "authadmin" : false
            }
            )
                .then((data) => {
                resolve(data);
                })
                .catch((err) => {
                reject(`Unable to update. Error: ${err}`);
                });
            }).catch((err_ => {
            }));       
        });
}
