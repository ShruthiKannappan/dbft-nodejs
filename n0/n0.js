// Import all required modeles
const express = require("express");
const bodyParser = require("body-parser");
require('fs');
const Node = require('./node');
const HTTP_PORT = 5030;
const P2P_PORT = 7030;
const app = express();
app.use(bodyParser.json());
const myid = 0;
const node = new Node(myid,P2P_PORT,[]);

app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});
node.listen();
app.post("/transact", (req, res) => {
  const { data } = req.body;
    node.add_own_message(data);
  res.send("received message from client");
});


let start = setTimeout(() => {
node.initiate_new_view(0,[null,null,null]);
}, 45000);






