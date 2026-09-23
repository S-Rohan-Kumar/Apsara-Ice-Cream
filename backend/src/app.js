import express from 'express';
import cors from 'cors';
import errorHandler from './middleware/error-handler.middleware.js';
import http from 'http';
import { initSocket  } from './socket/socket.js';
import helmet from 'helmet';


const app = express();
const server = http.createServer(app)

initSocket(server);

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        "http://localhost:5173",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:19006",
      ];
      if (allowed.includes(origin) || origin.startsWith("http://192.168.") || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});


//All routes imported
import authRoute from "./routes/auth.routes.js"
import categoryRoute from "./routes/category.routes.js"
import productRoute from "./routes/product.routes.js"
import offerRoute from "./routes/offers.routes.js"
import orderRoute from "./routes/order.routes.js"
import adminRoute from "./routes/admin.routes.js"
import notificationRoute from "./routes/notification.routes.js"


//All routes 
app.use('/api', authRoute);
app.use('/api/categories', categoryRoute)
app.use('/api/products', productRoute)
app.use('/api/offers', offerRoute)
app.use('/api/orders', orderRoute);
app.use('/api/admin',  adminRoute);
app.use('/api/notifications', notificationRoute);


app.use(errorHandler)

export {app, server}