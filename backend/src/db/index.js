import mongoose from "mongoose";


const connectDB  = async () => {
    try {
        const connetionInstance = await mongoose.connect(`${process.env.MONGO_URL}/apsara_db`);
        console.log(`✔️ Mongo DB connected | DB host : ${connetionInstance.connection.host}`)
    } catch (error) {
        console.log("❌ Mongoose connection failed !", error);
        process.exit(1)
    }
}

export default connectDB;