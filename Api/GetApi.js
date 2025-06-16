import express from "express";
import { user } from "../Mongodb/Mongoconnect.js";

const Getdata = express.Router();


Getdata.get("/", async (req, res) => {
    console.log("Data get");
res.send({msg:"created successfully"})
});

export default Getdata;
