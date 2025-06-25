const express = require("express");
const { amazon } = require("../../Mongodb/AmazonConnection");

const GetAmazondata = express.Router();

GetAmazondata.get("/", async (req, res) => {
    try {
        const files = await amazon.find();
        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching data");
    }
});

module.exports = GetAmazondata;