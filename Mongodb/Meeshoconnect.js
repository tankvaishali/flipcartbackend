const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    part1: { type: String },
    part2: { type: String }
});

const user = mongoose.model("meesho", schema);

module.exports = { user };
