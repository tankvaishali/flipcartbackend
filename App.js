import express from "express";
import cors from "cors";
import mongodb from "./Mongodb/Mongoconnect.js";
import Getdata from "./Api/Flipkart/GetApi.js";
import Postdata from "./Api/Flipkart/PostApi.js";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

mongodb();

app.use("/get", Getdata);
app.use("/post", Postdata);

app.listen(3001, () => {
    console.log("Port is running on 3001");
});
