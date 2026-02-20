import express from 'express';
import cors from 'cors';
import products from '../data/sample.js';
import authRoute from "./routes/auth.routes.js"

const app = express();
app.use(cors(

));
app.use(express.json({limit: '16kb'}));


app.use('/api/v1/auth' , authRoute)    

app.get("/api/products" , (req,res) => {
    console.log("Sending products ...")
    res.send(products);
})

app.get('/api/product/:id', (req,res) => {
    const id =  req.params.id
    const product = products.find((p) => p._id===id)
    if(!product){
        res.send("No data")
    }
    console.log(product)
    res.json(product)
})

export {app}