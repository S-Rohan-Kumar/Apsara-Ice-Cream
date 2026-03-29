import { CATEGORIES_URL } from "../constants.js";
import { apiSlice } from "./apiSlice.js";

export const categoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/categories
    getCategories: builder.query({
      query: () => CATEGORIES_URL,
      transformResponse: (res) => res.data,
      invalidatesTags: ["Category", "Product"],
      keepUnusedDataFor: 5,
    }),

    // POST /api/categories
    createCategory: builder.mutation({
      query: (data) => ({
        url: CATEGORIES_URL,
        method: "POST",
        body: data,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Category", "Product"]
    }),

    // PATCH /api/categories/:id
    updateCategory: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${CATEGORIES_URL}/${id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ["Category", "Product"]
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} = categoryApiSlice;
