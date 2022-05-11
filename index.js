const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
// middle ware
app.use(cors)
app.use(express.json)


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qyjpo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("doctors_portal").collection('services');

        app.get('/services' , async(req,res)=>{
            const query = {}
            const  cursor = servicesCollection.find(query);
            const result = await cursor.toArray()
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