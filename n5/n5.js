// Import all required modeles
const express = require("express");
const bodyParser = require("body-parser");
const Node = require('./node');
const HTTP_PORT = 5035;
const P2P_PORT = 7035;
const app = express();
app.use(bodyParser.json());
const myid = 5;
const node = new Node(myid,P2P_PORT,['ws://192.168.25.131:7030','ws://192.168.25.132:7031','ws://192.168.25.167:7032','ws://192.168.25.134:7033','ws://192.168.25.135:7034']);

app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});
node.listen();
app.post("/transact", (req, res) => {
  const { data } = req.body;
    node.add_own_message(data);
    res.send("received message from client");
});

