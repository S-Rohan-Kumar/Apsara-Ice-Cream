import { apiSlice } from './apiSlice';

export const storeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStoreStatus: builder.query({
      query: () => ({
        url: '/admin/store-status',
      }),
      transformResponse: (res) => res.data,
      providesTags: ['Store'],
    }),
    updateStoreStatus: builder.mutation({
      query: (body) => ({
        url: '/admin/store-status',
        method: 'PATCH',
        body,
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: ['Store'],
    }),
  }),
});

export const {
  useGetStoreStatusQuery,
  useUpdateStoreStatusMutation,
} = storeApiSlice;
