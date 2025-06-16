import mongoose, { Schema } from "mongoose";
import { type } from "os";

let mongodb=()=>{
    mongoose.connect('mongodb+srv://vaishalitank28603:vaishalitank312@cluster0.qzxy1.mongodb.net/flipcart')
        .then(() => console.log('Connected!'));

}
export default mongodb


const schema=new Schema({
    file:{type:String}
})
 export const user=mongoose.model("flipcart",schema)