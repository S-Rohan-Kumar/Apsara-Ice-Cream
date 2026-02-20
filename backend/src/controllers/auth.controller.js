import admin from "../config/firebase.js";
import  User  from "../models/user.model.js";
import {asyncHandler} from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import {APIError} from  "../utils/api-error.js";

const registerUser = asyncHandler( async(req,res) => {
    try {
        const header = req.headers.authorization;
    
        if(!header || !header.startsWith("Bearer ")){
            throw new APIError(401 , "Token Missing ")
        }
    
        const token = header.split(" ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
    
        const firebaseUid  = decoded.uid
        const phone = decoded.phone_number;
    
        let user = await User.findOne({ firebaseUid });
    
        if(!user){
            user = await User.create({
                firebaseUid,
                phone,
                name: req.body.name || "",
    
                role: req.body.role || "customer",
    
                location: req.body.location || {},
    
                address: req.body.address || {},
    
            });
        }
    
        return res
            .status(201)
            .json(new APIResponse(201 , user , "User authenticated"))
    } catch (error) {
        console.log(error);
        throw new APIError(500 , "Server Error" )
    }
})

const getCurrentUser = asyncHandler( async ( req, res) => {
    const user  =  await User.findById(req.user._id)
    if(!user){
        throw new APIError(404 , "User not found")
    }

    return res
        .status(200)
        .json(new APIResponse(200 , user , "User found"))
})


export {registerUser , getCurrentUser}