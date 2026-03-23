import { PRODUCTS_URL } from '../constants.js';
import { apiSlice }     from './apiSlice.js';


export const productApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
 
    // GET /api/products?category=:id
    getProducts: builder.query({
      query: (categoryId) => ({
        url   : `${PRODUCTS_URL}/all`,
        params: categoryId ? { category: categoryId } : {},
      }),
      transformResponse: (res) => res.data,
      providesTags    : ['Product'],
      keepUnusedDataFor: 60,
    }),
 
    // POST /api/products — multipart/form-data for image
    createProduct: builder.mutation({
      query: (formData) => ({
        url   : PRODUCTS_URL,
        method: 'POST',
        body  : formData,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),
 
    // PATCH /api/products/:id
    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({
        url   : `${PRODUCTS_URL}/${id}`,
        method: 'PATCH',
        body  : formData,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),
 
    // PATCH /api/products/:id/toggle-stock
    toggleStock: builder.mutation({
      query: (id) => ({
        url   : `${PRODUCTS_URL}/${id}/toggle-stock`,
        method: 'PATCH',
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Product'],
    }),
 
    // DELETE /api/products/:id
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
  useCreateProductMutation,
  useUpdateProductMutation,
  useToggleStockMutation,
  useDeleteProductMutation,
} = productApiSlice;

