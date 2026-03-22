import { OFFERS_URL } from "../constants.js";
import { apiSlice } from "./apiSlice.js";

export const offerApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/admin/offers
    getAllOffers: builder.query({
      query: () => `${OFFERS_URL}/`,
      transformResponse: (res) => res.data,
      providesTags: ["Offer"],
      keepUnusedDataFor: 5,
    }),

    // POST /api/offers
    createOffer: builder.mutation({
      query: (data) => ({
        url: `${OFFERS_URL}/`,
        method: "POST",
        body: data,
        // data: { title, discountPercent, category, startsAt, expiresAt }
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Offer"],
    }),

    // PATCH /api/offers/:id
    updateOffer: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${OFFERS_URL}/${id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Offer"],
    }),

    // DELETE /api/admin/offers/:id
    deleteOffer: builder.mutation({
      query: (id) => ({
        url: `${OFFERS_URL}/${id}`,
        method: "DELETE",
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Offer"],
    }),
  }),
});

export const {
  useGetAllOffersQuery,
  useCreateOfferMutation,
  useUpdateOfferMutation,
  useDeleteOfferMutation,
} = offerApiSlice;
