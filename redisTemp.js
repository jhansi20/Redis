const express = require("express");
const bodyParser = require("body-parser");
const { randomBytes } = require("crypto");

const app = express();
app.use(bodyParser.json());
let customers=require('./temp.json');
const port = 3000;
const Joi=require('joi');
const pgp = require('pg-promise')();
const schemas=require('./schemas');
const middleware=require('./middleware');
const redis=require('redis')
let client

const cn = {
    host: 'localhost',
    port: 26257,
    database: 'testdb',
    user: 'cockroach',
    password: '',
    max: 30
};
const db = pgp(cn);
db.connect();
(async () => {
  
  client = redis.createClient();

  client.on("error", (error) => console.error(`Error : ${error}`));

  await client.connect();
  console.log('Connected to redis')

  console.log("Connected to DB")
})();

async function getCustomerData(req, res) {
  let id=req.params.id;
  let results;
  let isCached = false;

  try {
    const cacheResults = await client.get(id);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      results = await db.oneOrNone('SELECT * FROM customers WHERE id=$1',parseInt(id));
      if (results!=null && results.length === 0) {
        throw "API returned an empty array";
      }
      await client.set(id, JSON.stringify(results));
    }

    res.send(results);
  } catch (error) {
    console.error(error);
    res.status(404).send("Data unavailable");
  }
}
async function deleteCustomerData(req,res){
  let id=req.params.id;
  try{
    const cacheResults=await client.get(id);
    if(cacheResults){
      await client.del(id)
    }
      await db.query(`DELETE FROM "customers" WHERE "id" = $1`, [parseInt(id)]);
      res.status(201).send('Deleted the customer from DB!');
  }catch(error){
    console.error(error)
    res.status(404).send('Internal error')
  }
}
async function updateCustomerData(req,res){
  const {name}=req.body;
  const id=req.params.id;
  try{
    if(await existsUsername(parseInt(id))){
    await db.query(`UPDATE "customers" 
    SET "name" = $1 WHERE "id" = $2`, [name, id]);
    let results = await db.oneOrNone('SELECT * FROM customers WHERE id=$1',parseInt(id));
    const cacheResults = await client.get(id);
    if (cacheResults) {
      await client.del(id)
      await client.set(id, JSON.stringify(results));
    }
    res.status(201).send('Updated the customer!');
    }
    else{
      res.send('Customer does not exist');
    }
  }
  catch(err){
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}

async function existsUsername(id){
  const result= await db.oneOrNone('SELECT * FROM customers WHERE id=$1',id);
  if(result==null) return false;
  return true;
}

app.get('/getAll', async (req, res) => {
  try {
    const result = await db.any('SELECT * FROM customers');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/getById/:id',middleware(schemas.custID,'params'),getCustomerData)
app.delete('/delete/:id',middleware(schemas.custID,'params'),deleteCustomerData)
app.put('/update/:id',middleware(schemas.custID,'params'),middleware(schemas.custPUT,'body'),updateCustomerData)
app.post('/post',middleware(schemas.custPOST,'body'),async(req,res)=>{
  const {name,id}=req.body;
try{
  if(await existsUsername(id)){
  res.send('Customer already exists with same id');
  }
  else{
    await db.query(`INSERT INTO "customers" ("id", "name")  
    VALUES ($1, $2)`, [id, name]);
    res.status(201).send('Added new customer!');
  }
}
catch(err){
  console.error(err);
  res.status(500).send('Internal Server Error');
}
})
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})


