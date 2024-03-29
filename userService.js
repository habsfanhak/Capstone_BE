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
    authadmin: Boolean,
    paymentMethods: [{
        cardNum: String,
        nameOnCard: String,
        expiry: String,
        cvv: String,
        postalCode: String
    }]
}, { collection: 'users' });

let User;

let resetSchema = new Schema({
    email: String,
    resetCode: {
        type: String,
        unique: true
    },
}, { collection: 'reset-tokens' });

let Reset;

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
            Reset = db.model("reset-tokens", resetSchema);
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

module.exports.registerAdminUser = function (userData) {
    return new Promise(function (resolve, reject) {
        bcrypt.hash(userData.password, 10).then(hash => {

            userData.password = hash;
            
            User.create(
            {
                "email" : userData.email,
                "fullName" : userData.fullName,
                "password" : userData.password,
                "phoneNumber" : userData.phoneNumber,
                "admin" : userData.admin,
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

module.exports.createResetToken = function(userEmail){
    const newResetCode = Math.floor(Math.random() * 9000000) + 1000000;
    const code = newResetCode.toString();

    Reset.create({
        "email" : userEmail,
        "resetCode" : code,
    });

    return code;
}

module.exports.setNewPass = function(userResetCode, newPass) {
    return new Promise(async function(resolve, reject) {
        try {
            const token = await Reset.findOne({ resetCode: userResetCode });

            if (!token) {
                reject(456);
                return;
            }

            const hashedPassword = await bcrypt.hash(newPass, 10);

            const updatedUser = await User.findOneAndUpdate(
                { email: token.email },
                { password: hashedPassword },
                { new: true }
            );

            if (!updatedUser) {
                reject(421);
                return;
            }

            await Reset.deleteMany({ email: token.email });

            resolve("Password changed successfully");
        } catch (error) {
            reject(error);
        }
    });
};

module.exports.addPayment = function(userEmail, cardNum, name, expiry, cvv, postalCode){
    return new Promise(function (resolve, reject){
        bcrypt.hash(cardNum, 20).then(hash => { cardNum = hash; });
        bcrypt.hash(expiry, 7).then(hash => { expiry = hash; });
        bcrypt.hash(cvv, 5).then(hash => { cvv = hash; });

        User.findOneAndUpdate(
            {email: userEmail},
            {$push: {paymentMethods: {
                cardNum: cardNum,
                nameOnCard: name,
                expiry: expiry,
                cvv: cvv,
                postalCode: postalCode
            }}},
            {new: true},
        ).exec().then(()=>{
            resolve("Card Added");
        }).catch((err)=>{
            reject(err);
        });
    });
}

module.exports.getUserPayment = function (email){
    return new Promise(function (resolve, reject){
        User.findOne({email}).exec().then((user)=>{
            if(user){
                if(user.paymentMethods && user.paymentMethods.length > 0){
                    resolve(user.paymentMethods);
                }
                else{
                    resolve([]);
                }
            }
            else{
                reject("Couldn't Find User");
            }  
        }).catch((err)=>{
            reject(err);
        })
    });
}

module.exports.deletePayment = function(userEmail, num){
    return new Promise(function (resolve, reject){
        User.findOneAndUpdate(
            {email: userEmail},
            {$pull: {paymentMethods: {cardNum: num}}},
        ).exec().then(()=>{
            resolve("Deleted");
        }).catch((err)=>{
            reject(err);
        });
    });
}

module.exports.getPayment = function(userEmail, cvv){
    return new Promise(async function (resolve, reject){
        console.log(userEmail);
        const user = await User.findOne({email: userEmail});
        if(user){
            if(user.paymentMethods && user.paymentMethods.length > 0){
                const payment = user.paymentMethods.find(payment => payment.cvv === cvv);
                if(payment){
                    resolve(payment);
                }
                else{
                    reject("Card Not Found");
                }
            }
        }
        else{
            reject("User Not Found");
        }
    });
}

module.exports.updatePayment = function(userEmail, cardNum, name, expiry, cvv, postalCode){
    return new Promise(function (resolve, reject){
        User.findOneAndUpdate(
            {email: userEmail, 'paymentMethods.cvv': cvv},
            {$set: {
                'paymentMethods.$.cardNum': cardNum,
                'paymentMethods.$.nameOnCard': name,
                'paymentMethods.$.expiry': expiry,
                'paymentMethods.$.cvv': cvv,
                'paymentMethods.$.postalCode': postalCode,
            }},
            {new: true}
        ).exec().then(()=>{
            resolve("Updated Payment Details");
        }).catch((err)=>{
            reject(err);
        });
    });
}

// add new bike
module.exports.addBike = function (bikeData) {
    return new Promise(function (resolve, reject) {
        Bike.create(
            {
                "brand" : bikeData.brand,
                "model" : bikeData.model,
                "type" : bikeData.type,
                "wheelSize" : bikeData.wheelSize,
                "frame_material" : bikeData.frame_material,
                "suspension_type" : bikeData.suspension_type,
                "price" : bikeData.price,
                "available_quantity" : bikeData.available_quantity
            }
        )
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                reject(`Unable to update. Error: ${err}`);
            });
    });
}
