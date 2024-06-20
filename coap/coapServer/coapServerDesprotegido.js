const coap = require("coap");
const server = coap.createServer();
let i = 0;
server.on("request", (req, res) => {
  i++;
  console.log(`Received request: ${i} ${req.method} ${req.url}`);
  res.end("Hello CoAP");
});

server.listen(() => {
  console.log("CoAP server is running");
});
