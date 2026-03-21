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
      socket.join(`order_${orderId}`);
    });

    socket.on("join_admin", () => {
      socket.join("admin_room");
    });

    socket.on("leave_order", (orderId) => {
      socket.leave(`order_${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};


export const emitNewOrder = (order) => {
    if(io) io.to("admin_room").emit("new_order", order);
}

export const emitStatusUpdate = (orderId,status) => {
    if(io) io.to(`order_${orderId}`).emit("status_update", status);
}