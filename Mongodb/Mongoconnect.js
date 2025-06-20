const mongoose = require("mongoose");

const mongodb = () => {
    mongoose.connect('mongodb+srv://vaishalitank28603:vaishalitank312@cluster0.qzxy1.mongodb.net/flipcart')
        .then(() => console.log('Connected to MongoDB!'))
        .catch(err => console.error(err));
};

module.exports = mongodb;
