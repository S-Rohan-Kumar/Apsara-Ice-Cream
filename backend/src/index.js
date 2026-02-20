import { app } from "./app.js"
import connectDB from "./db/index.js";
import dotenv from 'dotenv';

dotenv.config({
    path: "./.env"
})

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() =>{
        app.listen(PORT, () =>{
            console.log(`Server is running in http://localhost:${PORT}`);
        })
    })
    .catch((error) =>{
        console.log("Failed to connect to MongoDB", error);
    })
