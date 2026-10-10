import { APIError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js"; 

export const adminMiddleware = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
        throw new APIError(401, "Unauthorized");
    }
    
    if (user.role !== 'admin' && user.role !== 'owner' && user.role !== 'biller') {
        throw new APIError(403, "Forbidden - Store staff access required");
    }

    next();
});

export const requireOwnerMiddleware = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
        throw new APIError(401, "Unauthorized");
    }
    
    if (user.role !== 'admin' && user.role !== 'owner') {
        throw new APIError(403, "Forbidden - Store Owner access required");
    }

    next();
});

export default adminMiddleware;