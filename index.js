const express = require('express')
var cors = require('cors')
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
  origin: [
    'http://localhost:5173'
    // 'https://cars-doctor-c58eb.web.app',
    // 'https://cars-doctor-c58eb.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nvdjbig.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SCERET, (err, decoded)=>{
    if(err){
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  } )
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    app.post('/jwt', async (req, res) => {
      const loggedUser = req.body
      console.log("User for token : ", loggedUser);
      const token = jwt.sign(loggedUser, process.env.ACCESS_TOKEN_SCERET, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: "none"
        })
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body
      console.log("logging out : ", user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })



    const foodCollections = client.db("foodShare").collection("foods");
    const requestedfoodCollections = client.db("foodShare").collection("requestedfoods");

    app.get('/requestedfood', async (req, res) => {
      const result = await requestedfoodCollections.find().toArray();
      res.send(result)
    })

    app.get('/foods', async (req, res) => {
      let queryObject = {}
      let sortObject = {}
      const email = req.query.email
      const foodname = req.query.foodName
      const limit = parseInt(req.query.limit)
      const sortField = req.query.sortField
      const sortOrder = parseInt(req.query.sortOrder)
    
      if (email) {
        queryObject.email = email;
      }

      if (foodname) {
        queryObject.foodName = foodname;
      }
    
      if (sortField === 'quantity' || sortField === 'expiredate') {
        sortObject[sortField] = sortOrder;
      }
    
      const result = await foodCollections.find(queryObject).limit(limit).sort(sortObject).toArray();
      res.send(result);
    });


    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollections.findOne(query)
      res.send(result)
    })


    app.post('/foods', async (req, res) => {
      const food = req.body
      const result = await foodCollections.insertOne(food);
      res.send(result)
    })

    app.post('/requestedfood', async (req, res) => {
      const food = req.body
      const result = await requestedfoodCollections.insertOne(food);
      res.send(result)
    })

    app.put('/updatefoods/:id', async (req, res) => {
      const id = req.params.id
      const updatedProduct = req.body
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          foodName: updatedProduct.foodName,
          foodImg: updatedProduct.foodImg,
          quantity: updatedProduct.quantity,
          pickupLocation: updatedProduct.pickupLocation,
          price: updatedProduct.price,
          discount: updatedProduct.discount,
          resturantName: updatedProduct.resturantName,
          expiredate: updatedProduct.expiredate,
          additionalNotes: updatedProduct.additionalNotes,
          status: updatedProduct.status,
        },
      };
      const result = await foodCollections.updateOne(filter, updateDoc, options);
      res.send(result)
    })

    app.delete('/foods/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollections.deleteOne(query)
      res.send(result)
    })


    app.delete('/requestedfood/:id', async(req, res)=>{
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await requestedfoodCollections.deleteOne(query)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);







app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})