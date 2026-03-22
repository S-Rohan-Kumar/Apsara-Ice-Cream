import { AUTH_URL } from "../constants.js";
import { apiSlice } from './apiSlice.js';

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/auth/admin-login
    adminLogin: builder.mutation({
      query: (data) => ({
        url   : `${AUTH_URL}/admin-login`,
        method: 'POST',
        body  : data,  // { username, password }
      }),
      transformResponse : (response) => response.data,
      keepUnusedDataFor: 5,
    }),
  }),
});
 
export const { useAdminLoginMutation } = authApiSlice;
