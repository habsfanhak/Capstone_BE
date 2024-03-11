const express = require('express')
const app = express()
const dotenv = require("dotenv");
dotenv.config();
const cors = require('cors');
const userService = require('./userService.js')

app.use(cors());
app.use(express.json());

const HTTP_PORT = process.env.PORT || 8080;

app.post("/register", (req, res) => {
    userService.registerRegUser(req.body)
    .then((msg) => {
        res.json({ "message": msg });
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
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