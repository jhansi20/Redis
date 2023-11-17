const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
let customers=require('./temp.json');
const port = 4001;
const Joi=require('joi');
const pgp = require('pg-promise')();
const schemas=require('./schemas');
const middleware=require('./middleware');
var amqp = require('amqplib/callback_api');
let receiver
var queue = 'hello';

amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        receiver=channel
        if (error1) {
            throw error1;
        }
        channel.assertQueue(queue, {
            durable: false
        });
    });
});
function receiveMessage(req,res){
    let Messages;
receiver.consume(queue, function(msg) {
    Messages +=" " +msg.content.toString();
    console.log(" [x] Received %s", msg.content.toString());
}, {
    noAck: true
});
res.send(Messages)
}
app.get('/receiveMsg',receiveMessage)
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
  })
