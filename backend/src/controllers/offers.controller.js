import Offer from "../models/offer.model.js";
import APIResponse from "../utils/api-response.js"
const getactiveoffers=async()=>{
    try {
        const currentDate = new Date();
        const offers = await Offer.find({
            isActive: true,
            startsAt: { $lte: currentDate },
            expiresAt: { $gte: currentDate },
        }).populate("category", "name");
        return res.status(200).json(
            new APIResponse(200, offers, "Error fetching active offers")
        )
    } catch (error) {
        return res.status(400).json(
            new APIResponse(400, null, "Error fetching active offers")
        )
    }
}

export {getactiveoffers}