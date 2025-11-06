// Import all required modeles
const express = require("express");
const bodyParser = require("body-parser");
const Node = require('./node');
const HTTP_PORT = 5032;
const P2P_PORT = 7032;
const app = express();
app.use(bodyParser.json());
const myid = 2;
const node = new Node(myid,P2P_PORT,['ws://192.168.25.131:7030','ws://192.168.25.132:7031']);

app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});
node.listen();
app.post("/transact", (req, res) => {
  const { data } = req.body;
    node.add_own_message(data);
    res.send("received message from client");
});


