const express = require('express')
const app = express()

const dotenv = require("dotenv");
dotenv.config();

const cors = require('cors');

const passport = require("passport");
const jwt = require('jsonwebtoken');
const passportJWT = require("passport-jwt");

const userService = require('./userService.js')

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");

jwtOptions.secretOrKey = process.env.JWT_SECRET;

let strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
    console.log('payload received', jwt_payload);

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


app.use(cors());
app.use(express.json());
app.use(passport.initialize());

const HTTP_PORT = process.env.PORT || 8080;

app.post("/register", (req, res) => {
    userService.registerRegUser(req.body)
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

userService.connect()
.then(() => {
    app.listen(HTTP_PORT, () => { console.log("API listening on: " + HTTP_PORT) });  
})
.catch((err) => {
    console.log("Unable to start server", err)
    process.exit()
})