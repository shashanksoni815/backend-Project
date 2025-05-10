import mongoose  from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MONGODB connected !! DB Host : ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("MONGODB connection Error ", error);
        //if it gives an error it will exit with a failure code
        process.exit(1)
        
    }
}

export default connectDB;