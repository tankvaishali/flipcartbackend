import mongoose, { Schema } from "mongoose";

const schema = new Schema({
    part1: { type: String },
    part2: { type: String }
});

export const user = mongoose.model("flipcart", schema);