import { PRODUCTS_URL } from '../constants.js';
import { apiSlice }     from './apiSlice.js';

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // Admin — all products including out of stock
    getProducts: builder.query({
      query: ({ categoryId } = {}) => ({
        url   : `${PRODUCTS_URL}/all`,
        params: categoryId ? { category: categoryId } : {},
      }),
      transformResponse: (res) => res.data,
      providesTags    : ['Product'],
      keepUnusedDataFor: 60,
    }),

    // Customer facing (not used in dashboard)
    getPublicProducts: builder.query({
      query: ({ categoryId } = {}) => ({
        url   : PRODUCTS_URL,
        params: categoryId ? { category: categoryId } : {},
      }),
      transformResponse: (res) => res.data,
      keepUnusedDataFor: 60,
    }),

    createProduct: builder.mutation({
      query: (formData) => ({
        url   : PRODUCTS_URL,
        method: 'POST',
        body  : formData,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),

    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({
        url   : `${PRODUCTS_URL}/${id}`,
        method: 'PATCH',
        body  : formData,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),

    // Update per-variant availability for icecream products
    updateVariantAvailability: builder.mutation({
      query: ({ id, ...availability }) => ({
        url   : `${PRODUCTS_URL}/${id}/variant-availability`,
        method: 'PATCH',
        body  : availability, // { small: true, regular: false, large: true, ... }
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),

    // Toggle stock for single-type products
    toggleStock: builder.mutation({
      query: (id) => ({
        url   : `${PRODUCTS_URL}/${id}/toggle-stock`,
        method: 'PATCH',
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),

    deleteProduct: builder.mutation({
      query: (id) => ({
        url   : `${PRODUCTS_URL}/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),

  }),
});

export const {
  useGetProductsQuery,
  useGetPublicProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateVariantAvailabilityMutation,
  useToggleStockMutation,
  useDeleteProductMutation,
} = productApiSlice;