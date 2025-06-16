import express from "express";
import cors from "cors";
import mongodb from "./Mongodb/Mongoconnect.js";
import Getdata from "./Api/GetApi.js";

let app = express();
app.use(express.json());
app.use(cors());


mongodb();


app.use("/get", Getdata);

app.listen(3001, () => {
    console.log("Port is running on 3001");
});
