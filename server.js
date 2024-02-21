const express = require('express')
const app = express()
const dotenv = require("dotenv");
dotenv.config();
const userService = require('./userService.js')



const HTTP_PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
    res.send("Hi")
})

userService.connect()
.then(() => {
    app.listen(HTTP_PORT, () => { console.log("API started on: " + HTTP_PORT) });  
})
.catch((err) => {
    console.log("Unable to start server", err)
    process.exit()
})