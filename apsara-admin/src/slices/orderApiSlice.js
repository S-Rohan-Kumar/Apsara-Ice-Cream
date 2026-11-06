import { ORDERS_URL, ADMIN_URL } from "../constants.js";
import { apiSlice } from "./apiSlice.js";

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/orders?status=placed,preparing&page=1
    getAdminOrders: builder.query({
      query: ({ status = "", page = 1 } = {}) => ({
        url: ORDERS_URL,
        params: { status, page },
      }),
      transformResponse: (res) => res.data,
      providesTags: ["Order"],
      keepUnusedDataFor: 5,
    }),

    // GET /api/orders/admin/:id
    getAdminOrderById: builder.query({
      query: (id) => `${ORDERS_URL}/admin/${id}`,
      transformResponse: (res) => res.data,
      providesTags: (result, error, id) => [{ type: "Order", id }],
      keepUnusedDataFor: 5,
    }),

    // PATCH /api/orders/:id/status
    updateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `${ORDERS_URL}/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (res) => res.data,
      // Invalidate both list and this specific order detail
      invalidatesTags: (result, error, { id }) => [
        "Order",
        { type: "Order", id },
      ],
    }),

    // PATCH /api/orders/:id/assign-rider
    assignRiderToOrder: builder.mutation({
      query: ({ id, staffId, name, phone }) => ({
        url: `${ORDERS_URL}/${id}/assign-rider`,
        method: "PATCH",
        body: { staffId, name, phone },
      }),
      transformResponse: (res) => res.data,
      invalidatesTags: (result, error, { id }) => [
        "Order",
        { type: "Order", id },
        "Staff",
      ],
    }),

    // GET /api/admin/reports/monthly?from=&to=
    getMonthlyReport: builder.query({
      query: ({ from, to }) => ({
        url: `${ADMIN_URL}/reports/monthly`,
        params: { from, to },
      }),
      transformResponse: (res) => res.data,
      providesTags: ["Report"],
      keepUnusedDataFor: 5,
    }),
  }),
});

export const {
  useGetAdminOrdersQuery,
  useGetAdminOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useAssignRiderToOrderMutation,
  useGetMonthlyReportQuery,
} = orderApiSlice;
