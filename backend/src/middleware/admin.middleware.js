import { APIResponse } from "../utils/api-response.js";
import { APIError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js"; 

const adminMiddleware = asyncHandler( async (req, res , next) => {
    const user  = req.user;

    if(!user){
        throw new APIError(401 , "Unauthorized")
    }
    
    if(user.role !== 'admin'){
        throw new APIError(403 , "Forbidden")
    }

    next()

})

export default adminMiddleware; 