import express from "express";
import cors from "cors";
import mongodb from "./Mongodb/Mongoconnect.js";
import Getdata from "./Api/Flipkart/GetApi.js";
import Postdata from "./Api/Flipkart/PostApi.js";
import path from "path";
import Getmeesho from "./Api/Meesho/Getmeesho.js";
import Postmeesho from "./Api/Meesho/PostMeesho.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

mongodb();

app.use("/get", Getdata);
app.use("/post", Postdata);
app.use("/getmeesho", Getmeesho);
app.use("/postmeesho", Postmeesho);

app.listen(3001, () => {
    console.log("Port is running on 3001");
});
