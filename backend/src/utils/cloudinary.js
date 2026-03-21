import { v2 as cloudinary } from 'cloudinary'
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({
    path : "./.env"
});

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUD_API_KEY, 
  api_secret: process.env.CLOUD_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        const response = await cloudinary.uploader.upload(
            localFilePath,{
                resource_type: "auto"
            }
        )
        console.log("File uploaded to Cloudinary successfully: File src : "+response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.error("Cloudinary upload failed:", error);
        return null
    }
}

const deleteFromCloundnary = async (publicID) =>{
    try {
        const res = await cloudinary.uploader.destroy(publicID)
        console.log(res)
    } catch (error) {
        console.log("Error deleteing from cloudnary",error)
        return null
    }
}  

export { uploadOnCloudinary, deleteFromCloundnary }