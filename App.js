import express from "express";
import cors from "cors";

let app=express()
app.use(express.json())
app.use(cors())

app.listen(3001,()=>{
    console.log("port is running on 3001");
    
})