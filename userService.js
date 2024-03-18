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

let bikeSchema = new Schema({
    brand: String,
    model: String,
    type: String,
    wheelSize: Number,
    frame_material: String,
    suspension_type: String,
    price: Number,
    available_quantity: Number,
}, { collection: 'bikes' });

let Bike;

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
        db = mongoose.createConnection(mongoDBConnectionString);

        db.on('error', err => {
            reject(err);
        });

        db.once('open', () => {
            console.log("Connected to DB instance.")
            User = db.model("users", userSchema);
            Bike = db.model("bikes", bikeSchema);
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

module.exports.login = function (userData) {
    return new Promise(function (resolve, reject) {

        User.findOne({ email: userData.email })
            .exec()
            .then(user => {
                bcrypt.compare(userData.password, user.password).then(res => {
                    if (res === true) {
                        resolve(user);
                    } else {
                        reject("Incorrect password for user " + userData.email );
                    }
                });
            }).catch(err => {
                reject("Unable to find user " + userData.email);
            });
    });
}

module.exports.getBikes = function () {
    return new Promise(function (resolve, reject) {
        Bike.find({})
            .exec()
            .then(bikes => {
                resolve(bikes);
            }).catch(err => {
                reject("Unable to find bikes");
            });
    });
}