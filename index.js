
const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

//middleware
app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qyjpo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyToken(req,res,next){
  const authHeader = req?.headers?.authorization;
  if(!authHeader){
    return res.status(401).send({message:'unauthorize'})
  }else{
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
      if(err){
        return res.status(403).send({message:'forbidden'})
      }
      req.decoded=decoded
      next()
    });
  }

}
async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("doctors_portal").collection('services');
        const bookingCollection = client.db("doctors_portal").collection('booking');
        const usersCollection = client.db("doctors_portal").collection('users');
        const doctorCollection = client.db("doctors_portal").collection('doctor');

        // get user 
        app.get('/users',verifyToken, async(req,res)=>{
          const result = await usersCollection.find().toArray()
          res.send(result)
        })
        // make admin api 
        app.put('/user/admin/:email', verifyToken, async(req,res)=>{ 
          const email = req.params.email;
          const requester =  req.decoded.email
          const requesterAccount = usersCollection.findOne({email:requester});
          if(requesterAccount.role === 'admin'){
            const filter = {email:email}
            const updatedDoc ={
              $set: {role:'admin'},
            };
            const result = await usersCollection.updateOne(filter,updatedDoc);
             res.send(result)
          }else{
             res.status(403).send({message:'forbidden'})

          }
        });

        app.get('/admin/:email', async (req,res)=>{
          const email = req.params.email;
          const user = await usersCollection.findOne({email:email})
          const isAdmin = user.role === 'admin'
          res.send({admin:isAdmin})

        })
        
        app.put('/users/:email',async(req,res)=>{
          const email = req.params.email;
          const user = req.body;
          const filter = {email:email}
          const options = {upsert:true};
          const updatedDoc ={
            $set: user,
          };
          const result = await usersCollection.updateOne(filter,updatedDoc,options);
          const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });
          res.send({result,token})
        })
        // get all services api 
        app.get('/services' , async(req,res)=>{
            const query = {}
            const  cursor = servicesCollection.find(query).project({name:1});
            const result = await cursor.toArray()
            res.send(result)
        })
        // get available slot data 
        app.get('/available',async(req,res)=>{
          const date = req.query.date || 'May 13, 2022';
          // get all services
          const services = await servicesCollection.find().toArray();
          

          // get the booking of day 
          const query = {date:date};
          const bookings = await bookingCollection.find(query).toArray();
          services.forEach(service => {
            const serviceBooking = bookings.filter(b => b.treatmentName === service.name);
            const booked = serviceBooking.map(s => s.slot);
            const available = service.slots.filter(s=>!booked.includes(s));
            service.slots= available
          });
          res.send(services)
        })

        // booking  crud operation
        app.get('/booking',verifyToken,async(req,res)=>{
          const patientEmail = req.query.patientEmail
          const decodedEmail = req?.decoded?.email
          if(patientEmail === decodedEmail){
            const query = {patientEmail:patientEmail};
            const bookings = await bookingCollection.find(query).toArray();
             return res.send(bookings)
          }else{
            return res.status(403).send({message:'forbidden'})
          }

        })

        app.post('/booking', async(req,res)=>{
          const booking = req.body.bookingData;
          const query = {treatmentName:booking?.treatmentName,patientName:booking?.patientName,date:booking?.date};
          const exist = await bookingCollection.findOne(query)
         
          if(exist){
            return res.send({success : false, booking:exist})
          }
          const result = await bookingCollection.insertOne(booking);
          res.send({success:true ,result});
        });

        //doctors 
        app.post('/doctor', verifyToken, async(req,res)=>{
          const doctor = req.body;
          const result = await doctorCollection.insertOne(doctor);
          res.send(result)

        })
      
} finally {
//   await client.close();
}
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('dr- portal server is running !')
})

app.listen(port, () => {
  console.log(`doctor-portal app listening on port ${port}`)
})