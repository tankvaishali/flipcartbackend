const express = require("express");
const { user } = require("../../Mongodb/Flipkartconnect");

const Getdata = express.Router();

Getdata.get("/", async (req, res) => {
    try {
        const files = await user.find();
        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching data");
    }
});

module.exports = Getdata;
