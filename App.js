// import express from "express";
// import cors from "cors";
// import mongodb from "./Mongodb/Mongoconnect.js";
// // import Getdata from "./Api/Flipkart/GetApi.js";
// // import Postdata from "./Api/Flipkart/PostApi.js";
// import path from "path";
// import GetAmazondata from "./Api/Amazon/GetApi.js";
// // import PostAmazondata from "./Api/Amazon/PostApi.js";
// // import Getmeesho from "./Api/Meesho/Getmeesho.js";
// // import Postmeesho from "./Api/Meesho/PostMeesho.js";

// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

// mongodb();

// // app.use("/get", Getdata);
// // app.use("/post", Postdata);
// // app.use("/getmeesho", Getmeesho);
// // app.use("/postmeesho", Postmeesho);
// app.use("/getamazon", GetAmazondata);
// // app.use("/postamazon", PostAmazondata);

// app.listen(3001, () => {
//     console.log("Port is running on 3001");
// });



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
