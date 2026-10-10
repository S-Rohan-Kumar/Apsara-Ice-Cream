import { Server, Socket } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join_order", (orderId) => {
      let idStr = orderId;
      if (typeof orderId === 'object' && orderId !== null) {
        idStr = orderId.orderId || orderId._id || orderId.id;
      }
      if (idStr) {
        const cleanId = idStr.toString();
        socket.join(`order_${cleanId}`);
      }
    });

    socket.on("join_admin", () => {
      socket.join("admin_room");
    });

    socket.on("leave_order", (orderId) => {
      let idStr = orderId;
      if (typeof orderId === 'object' && orderId !== null) {
        idStr = orderId.orderId || orderId._id || orderId.id;
      }
      if (idStr) {
        const cleanId = idStr.toString();
        socket.leave(`order_${cleanId}`);
      }
    });

    socket.on("rider_location", ({ orderId, lat, lng, heading }) => {
      if (orderId && lat && lng) {
        io.to(`order_${orderId}`).emit("rider_location_updated", {
          lat,
          lng,
          heading: heading || 0,
          updatedAt: new Date(),
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};


export const emitNewOrder = (order) => {
    if(io) io.to("admin_room").emit("new_order", order);
}

export const emitOrderCancelled = (order) => {
    if (io) {
        const idStr = order._id?.toString?.() || order._id || '';
        const payload = {
            orderId: idStr,
            _id: idStr,
            orderNumber: order.orderNumber,
            status: 'cancelled',
            customer: order.customer,
            cancellationReason: order.cancellationReason || 'Cancelled by customer within 1 minute',
            cancelledAt: order.cancelledAt || new Date(),
        };
        io.to("admin_room").emit("order_cancelled", payload);
        io.to("admin_room").emit("order_status_updated", { orderId: idStr, status: 'cancelled' });
        if (idStr) {
            io.to(`order_${idStr}`).emit("status_update", 'cancelled');
            io.to(`order_${idStr}`).emit("order_status_updated", { orderId: idStr, status: 'cancelled' });
        }
        io.emit("order_cancelled", payload);
        io.emit("order_status_updated", { orderId: idStr, status: 'cancelled' });
    }
}

export const emitStatusUpdate = (orderId, status) => {
    if (io) {
        const idStr = orderId?.toString?.() || orderId;
        io.to(`order_${idStr}`).emit("status_update", status);
        io.to(`order_${idStr}`).emit("order_status_updated", { orderId: idStr, status });
        io.emit("order_status_updated", { orderId: idStr, status });
    }
}

export const emitBroadcast = (broadcastData) => {
    if (io) io.emit("broadcast_message", broadcastData);
}

export const emitStoreStatus = (statusData) => {
    if (io) io.emit("store_status_changed", statusData);
}

export const emitOffersUpdated = (offersData) => {
    if (io) io.emit("offers_updated", offersData || {});
}

export const emitProductsUpdated = (productData) => {
    if (io) io.emit("products_updated", productData || {});
}

export const emitRiderLocationUpdated = (orderId, locationData) => {
    if (io) {
        const idStr = orderId?.toString?.() || orderId;
        const payload = { ...(locationData || {}), orderId: idStr };
        io.to(`order_${idStr}`).emit("rider_location_updated", payload);
        io.emit("rider_location_updated", payload);
    }
}