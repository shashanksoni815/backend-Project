// require('dotenv').config({path: './env'});

import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./env"
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
.catch((err) => console.log(`MONGO DB connection failed ! ${err}`));



/*
import express from "express";
const app = express();

// connecting DataBase
// function if'e
(async () => {
    try {
        // connecting DataBase with its name
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        //After connecting DB if we get any error it will show it out. 
        app.on("error", (error) => {
            console.log("ERROR : ", error);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`App is listining to the port ${process.env.PORT}`)
        })

    } catch (error) {
        console.error(error)
        throw error;
    }
})()

*/