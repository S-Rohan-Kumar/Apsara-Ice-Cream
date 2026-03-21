import express from 'express';
import cors from 'cors';
import products from '../data/sample.js';
import errorHandler from './middleware/error-handler.middleware.js';
import http from 'http';
import { initSocket  } from './socket/socket.js';
import helmet from 'helmet';



const app = express();
const server = http.createServer(app)

initSocket(server);

app.use(helmet())
app.use(cors({
    origin: '*'
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

//All routes 
app.use('/api/auth' , authRoute)  
app.use('/api/', authRoute)  
app.use('/api/categories', categoryRoute)
app.use('/api/products', productRoute)
app.use('/api/offers', offerRoute)


app.use(errorHandler)

export {app}