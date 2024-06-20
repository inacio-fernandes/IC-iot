const coap = require("coap");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const async = require("async");
const server = coap.createServer();
let requestCount = 0;
let autoIncrementValue = 0; // Variável de autoincremento

// Configuração do Rate Limiting
const rateLimiter = new RateLimiterMemory({
  points: 5, // Número de requisições permitidas
  duration: 1, // Por segundo
  blockDuration: 20, // Bloqueia por 20 segundos se o limite for excedido
});

// Configuração da fila de processamento
const requestQueue = async.queue((task, callback) => {
  if (!task.res.finished) {
    task.res.end(task.responseMessage);
  }
  callback();
}, 20); // Limite de requisições processadas simultaneamente

// Função para processar a requisição
const processRequest = (req, res) => {
  const ip = req.rsinfo.address; // IP do cliente

  // Aplica o rate limiting
  rateLimiter
    .consume(ip)
    .then(() => {
      // Verifica se a requisição é malformada ou muito grande
      if (req.url === "/invalid_uri" || req.payload.toString().length > 1024) {
        if (!res.finished) {
          res.code = "4.00";
          res.end("Bad Request");
          console.log(`Received invalid request: ${req.method} ${req.url}`);
        }
      } else {
        requestCount++;
        console.log(
          `Received request ${requestCount}: ${req.method} ${req.url} from IP ${ip}`
        );

        // Prepara a resposta
        let responseMessage = "Hello CoAP";
        if (req.method === "GET" && req.url === "/") {
          autoIncrementValue++;
          responseMessage = `Auto-increment value: ${autoIncrementValue}`;
        }

        // Adiciona a requisição à fila de processamento
        requestQueue.push({ req, res, responseMessage }, (err) => {
          if (err) {
            console.error(`Error processing request: ${err.message}`);
          }
        });
      }
    })
    .catch(() => {
      // Responde com Too Many Requests se o limite for excedido
      if (!res.finished) {
        requestCount++;
        res.code = "4.29";
        res.end("Too Many Requests");
        console.log(`Rate limit exceeded for IP ${ip} (${requestCount})`);
      }
    });

  // Define um timeout para a resposta
  const responseTimeout = setTimeout(() => {
    if (!res.finished) {
      res.code = "5.04";
      res.end("Request Timeout");
      console.log(`Request timed out: ${req.method} ${req.url}`);
    }
  }, 5000); // Timeout de 5 segundos

  // Limpa o timeout quando a resposta for encerrada
  res.on("finish", () => {
    clearTimeout(responseTimeout);
  });
};

// Evento para novas requisições
server.on("request", (req, res) => {
  processRequest(req, res);
});

// Inicia o servidor
server.listen(() => {
  console.log("Improved CoAP server is running");
});
