import { APIResponse } from "../utils/api-response.js";

const createoffer=async()=>{
    const {title, description, category, discountPercent, minOrderAmount, startsAt, expiresAt, createdBy}=req.body;
    try {
        const newOffer = new Offer({
            title,
            description,
            category,
            discountPercent,
            minOrderAmount,
            startsAt,
            expiresAt,
            createdBy,
        });
        const savedOffer = await newOffer.save();
        return res.status(201).json(
            new APIResponse(201, savedOffer, "Offer created successfully")
        )
    } catch (error) {
        return res.status(400).json(
            new APIResponse(400, null, "Error creating offer")
        )
    }

}

const updateoffer=async()=>{
    const {id}=req.params;
    const {title, description, category, discountPercent, minOrderAmount, startsAt, expiresAt, isActive}=req.body;
    try {
        const updatedOffer = await Offer.findByIdAndUpdate(
            id,
            { title, description, category, discountPercent, minOrderAmount, startsAt, expiresAt, isActive },
            
            { new: true }
        );
        if (!updatedOffer) {
            return res.status(404).json(
                new APIResponse(404, null, "Offer not found")
            )
        }
        return res.status(200).json(
            new APIResponse(200, updatedOffer, "Offer updated successfully")
        )
    } catch (error) {
        return res.status(400).json(
            new APIResponse(400, null, "Error updating offer")
        )
    }
}

const deleteoffer=async()=>{
    const {id}=req.params;
    try {
        const deletedOffer = await Offer.findByIdAndDelete(id);
        if (!deletedOffer) {
            return res.status(404).json(
                new APIResponse(404, null, "Offer not found")
            )
        }
        return res.status(200).json(
            new APIResponse(200, deletedOffer, "Offer deleted successfully")
        )
    } catch (error) {
        return res.status(400).json(
            new APIResponse(400, null, "Error deleting offer")
        )
    }

}
export default
{
    createoffer,
    updateoffer,
    deleteoffer
}
