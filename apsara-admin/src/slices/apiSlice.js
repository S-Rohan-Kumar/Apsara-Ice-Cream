import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../constants.js";

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const userInfo = getState().auth?.userInfo;
    
    const localUser = userInfo || JSON.parse(localStorage.getItem("userInfo") || "null");

    if (localUser) {
      const token = localUser.accessToken || localUser.token;
      
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return headers;
  },
});

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ["Category", "Product", "Order", "Offer", "Report", "Store"],
  endpoints: (builder) => ({}),
});
