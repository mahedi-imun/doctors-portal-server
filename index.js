
const express = require('express')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

//middleware
app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qyjpo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("doctors_portal").collection('services');
        const bookingCollection = client.db("doctors_portal").collection('booking');
        // get all services api 
        app.get('/services' , async(req,res)=>{
            const query = {}
            const  cursor = servicesCollection.find(query);
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
        app.get('/booking',async(req,res)=>{
          const patientEmail = req.query.patientEmail
          const query = {patientEmail:patientEmail};
          const bookings = await bookingCollection.find(query).toArray();
          res.send(bookings)
          
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