const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    part1: { type: String },
    part2: { type: String }
});

const amazon = mongoose.model("amazon", schema);

module.exports = { amazon };
