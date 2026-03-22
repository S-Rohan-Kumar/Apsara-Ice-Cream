import { ADMIN_URL } from "../constants.js";
import { apiSlice } from "./apiSlice.js";

export const notificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/admin/broadcast
    broadcastNotification: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/broadcast`,
        method: "POST",
        body: data, // { title, body, data: { type: 'promotional' } }
      }),
      transformResponse: (res) => res.data,
    }),
  }),
});

export const { useBroadcastNotificationMutation } = notificationApiSlice;
