const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
let customers=require('./temp.json');
const port = 3000;
const Joi=require('joi');
const pgp = require('pg-promise')();
const schemas=require('./schemas');
const middleware=require('./middleware');
var amqp = require('amqplib/callback_api');
let sender
var queue = 'hello';
amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error, channel) {
    sender=channel
    if (error) {
      throw error;
    }
    channel.assertQueue(queue, {
      durable: false
    });
  });
});
 function sendMessage(req,res){
    var msg="Hellooooo";
    sender.sendToQueue(queue,Buffer.from(msg))
    console.log(" [x] Sent %s", msg);
    res.send('Message sent')
}

app.get('/sendMsg',sendMessage)
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
  })
