// for create exe run this command 
// pkg . --targets node18-win-x64 --output flipcart-backend.exe

const express = require("express");
const cors = require("cors");
const mongodb = require("./Mongodb/Mongoconnect");
const path = require("path");
const GetAmazondata = require("./Api/Amazon/GetApi");
const PostAmazondata = require("./Api/Amazon/PostApi");
const Getdata = require("./Api/Flipkart/GetApi");
const Postdata = require("./Api/Flipkart/PostApi");
const Getmeesho = require("./Api/Meesho/Getmeesho");
const Postmeesho = require("./Api/Meesho/PostMeesho");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongodb();

app.use("/get", Getdata);
app.use("/post", Postdata);
app.use("/getmeesho", Getmeesho);
app.use("/postmeesho", Postmeesho);
app.use("/getamazon", GetAmazondata);
app.use("/postamazon", PostAmazondata);

app.listen(3001, () => {
    console.log("Port is running on 3001");
});
