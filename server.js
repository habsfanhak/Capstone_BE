const express = require('express')
const app = express()

const cors = require('cors');
app.use(cors());

const nodemailer = require("nodemailer");
const bodyParser = require('body-parser');

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true, parameterLimit: 50000 }));


const dotenv = require("dotenv");
dotenv.config();

const passport = require("passport");
const jwt = require('jsonwebtoken');
const passportJWT = require("passport-jwt");

const userService = require('./userService.js')
const cloudinary = require('cloudinary').v2; // Import Cloudinary SDK

          
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");

jwtOptions.secretOrKey = process.env.JWT_SECRET;

let strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {

    if (jwt_payload) {

        next(null, 
            { _id: jwt_payload._id, 
                email: jwt_payload.userName,
                admin: jwt_payload.admin,
                authadmin: jwt_payload.authadmin,
                fullName: jwt_payload.fullName
        }); 
    } else {
        next(null, false);
    }
});

passport.use(strategy);

app.use(express.json());
app.use(passport.initialize());
// Parse application/json

const HTTP_PORT = process.env.PORT || 8080;

const checkAuth = (req, res, next) => {
    // Extract the JWT token from the request headers
    const token = req.headers.authorization.replace('JWT ', '');
    
    // Decode the JWT token
    const decodedToken = jwt.decode(token);
    // Check if the decoded token contains the authuser property
    if (decodedToken && decodedToken.authadmin) {
        // If authuser is present, proceed to the next middleware
        next();
    } else {
        // If authuser is not present, send an error response
        res.status(403).json({ "message": "You are not authorized to access this resource" });
    }
};

app.post("/register", (req, res) => {
    userService.registerRegUser(req.body)
    .then((msg) => {
        res.json({ "message": msg });
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
    });
})

app.post("/registeradmin", passport.authenticate('jwt', { session: false }), checkAuth, (req, res) => {
    userService.registerAdminUser(req.body)
    .then((msg) => {
        res.json({ "message": msg });
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
    });
})

app.post("/login", (req, res) => {
    userService.login(req.body)
    .then((user) => {
        var payload = { 
            _id: user._id,
            email: user.email,
            admin: user.admin,
            authadmin: user.authadmin,
            fullName: user.fullName
        };

        var token = jwt.sign(payload, jwtOptions.secretOrKey);

        res.json({ "message": "login successful", "token": token });
    }).catch(msg => {
        res.status(422).json({ "message": `login bad, message  ${msg}` });
    });
})

app.post("/reset", async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.zohocloud.ca',
            port: 465,
            secure: true,
            auth: {
                user: 'capstone_bike@zohomail.ca',
                pass: 'WSr44$1T7=A3'
            }
        });

        const code = userService.createResetToken(req.body.email);
        const text = "Your Password Reset Code: " + code;

        const mailOptions = {
            from: 'capstone_bike@zohocloud.ca',
            to: req.body.email,
            subject: "Your Password Reset Code",
            text: text
        };

        const info = await transporter.sendMail(mailOptions);
        res.json({"message" : "Success"});
    } catch (error) {
        console.error(error);
        res.status(422).json({ "message": "Failed to process the request" });
    }
});

app.post("/newpass", async (req, res) => {
    userService.setNewPass(req.body.resetCode, req.body.newPass).then((mes) => {
        console.log(mes);
        res.status(200).json({ "message": "200" });
    }).catch((err) =>{
        console.log(err);
        if(err == 456){
            res.status(456).json({ "message": "456" });
        }
        else if(err == 421){
            res.status(421).json({ "message": "421" });
        }
    });
});

app.post("/addpayment", (req, res) => {
    userService.addPayment(req.body.email, req.body.cardNum, req.body.name, req.body.expiry, req.body.cvv, req.body.postalCode)
    .then(()=>{
        res.status(200).json({ "message": "200" });
    }).catch((err)=>{
        res.status(400).json({ "message": err });
    });
});

app.post("/userpayment", passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.getUserPayment(req.body.email).then((payment) => {
        res.status(200).json(payment);
    }).catch((err) => {
        console.log(err);
        res.status(422).json({ "message": err });
    });
})

app.post("/deletepayment", passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.deletePayment(req.body.email, req.body.num).then((mes)=>{
        console.log(mes);
        res.status(200).json({ "message": "200" });
    }).catch((err)=>{
        res.status(400).json({ "message": err });
    });
})

app.post("/getpayment", passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.getPayment(req.body.email, req.body.cvv).then((card) => {
        res.status(200).json(card);
    }).catch((err) => {
        console.log(err);
        res.status(400).json({"message": "400"});
    });
})

app.post("/updatepayment", passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.updatePayment(req.body.email, req.body.cardNum, req.body.name, req.body.expiry, req.body.cvv, req.body.postalCode).then((mes)=>{
        console.log(mes);
        res.status(200).json({"message": "Paymet Details Updated"});
    }).catch((err)=>{
        console.log(err);
        res.status(400).json({"message": err});
    });
})

app.get("/bikes", (req, res) => {
    userService.getBikes()
    .then((bikes) => {
        res.json(bikes);
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
    });
})

app.get("/users", passport.authenticate('jwt', { session: false }), checkAuth, (req, res) => {
    userService.getUsers()
    .then((users) => {
        res.json(users);
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
    });
})

app.put("/singleuser", passport.authenticate('jwt', { session: false }), checkAuth, (req, res) => {
    userService.getSingle(req.body.email)
    .then((user) => {
        res.json(user);
    }).catch((msg) => {
        console.log(msg)
        res.status(422).json({ "message": msg });
    });
})

app.post("/singleuser", passport.authenticate('jwt', { session: false }), checkAuth, (req, res) => {
    userService.updateSingle(req.body)
    .then((user) => {
        res.json(user);
    }).catch((msg) => {
        console.log(msg)
        res.status(422).json({ "message": msg });
    });
})

app.delete("/singleuser", passport.authenticate('jwt', { session: false }), checkAuth, (req, res) => {
    userService.deleteSingle(req.body)
    .then((user) => {
        res.json(user);
    }).catch((msg) => {
        console.log(msg)
        res.status(422).json({ "message": msg });
    });
})



const checkAdmin = (req, res, next) => {
    // Extract the JWT token from the request headers
    const token = req.headers.authorization.replace('JWT ', '');
    
    // Decode the JWT token
    const decodedToken = jwt.decode(token);
    
    // Check if the decoded token contains the authuser property
    if (decodedToken && decodedToken.admin) {
        // If authuser is present, proceed to the next middleware
        next();
    } else {
        // If authuser is not present, send an error response
        res.status(403).json({ "message": "You are not authorized to access this resource" });
    }
};

app.post("/addBike", passport.authenticate('jwt', { session: false }), checkAdmin, (req, res) => {

    const bikeInfo = req.body;

    console.log(req.body)

    const base64Image = req.body.image;

    const imageBuffer = Buffer.from(base64Image, 'base64');

    const currentDate = new Date();
    const fileName = `image_${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}_${currentDate.getHours()}-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;

    cloudinary.uploader.upload_stream({ resource_type: "image", public_id: fileName }, (error, result) => {
        if (error) {
            console.error("Error uploading image to Cloudinary:", error);
        } else {
            console.log("Image uploaded successfully:", result);
        }
    }).end(imageBuffer);


    userService.addBike(bikeInfo, fileName)
    .then((msg) => {
        res.json({ "message": msg });
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
    });
})

app.post("/getBike", async (req, res) =>{
    await userService.getBike(req.body.model).then((bike) =>{
        res.status(200).json(bike);
    }).catch((err) => {
        res.status(400).json({"message" : err});
    });
})

app.post("/purchase", async (req, res) =>{
    await userService.pruchase(req.body.brand, req.body.model, req.body.price).then((url) =>{
        res.status(200).json(url);
    }).catch((err) => {
        res.status(400).json({"message" : err});
    });
})

app.post("/updatequantity", (req, res) =>{
    userService.updateQuantity(req.body.model).then(() =>{
        console.log("Quantity Updated");
        res.status(200).json("Quantity Updated");
    }).catch((err) => {
        res.status(400).json({"message" : err});
    });
})


userService.connect()
.then(() => {
    app.listen(HTTP_PORT, () => { console.log("API started on: " + HTTP_PORT) });  
})
.catch((err) => {
    console.log("Unable to start server", err)
    process.exit()
})