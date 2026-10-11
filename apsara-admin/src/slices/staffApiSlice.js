import { STAFF_URL } from "../constants.js";
import { apiSlice } from "./apiSlice.js";

export const staffApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/staff
    getStaff: builder.query({
      query: () => STAFF_URL,
      transformResponse: (res) => res.data,
      providesTags: ["Staff"],
      keepUnusedDataFor: 5,
    }),

    // GET /api/staff/active
    getActiveStaff: builder.query({
      query: () => `${STAFF_URL}/active`,
      transformResponse: (res) => res.data,
      providesTags: ["Staff"],
      keepUnusedDataFor: 5,
    }),

    // POST /api/staff
    createStaff: builder.mutation({
      query: (data) => ({
        url: STAFF_URL,
        method: "POST",
        body: data,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Staff"],
    }),

    // PATCH /api/staff/:id
    updateStaff: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${STAFF_URL}/${id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Staff"],
    }),

    // DELETE /api/staff/:id
    deleteStaff: builder.mutation({
      query: (id) => ({
        url: `${STAFF_URL}/${id}`,
        method: "DELETE",
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Staff"],
    }),
  }),
});

export const {
  useGetStaffQuery,
  useGetActiveStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = staffApiSlice;
