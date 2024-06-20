const coap = require("coap");
const { fork } = require("child_process");

// Configurações do servidor CoAP
const serverUrl = "coap://192.168.1.75";
const path = "/test";
const messageSize = 1000; // Tamanho das mensagens
const numberOfClients = 1000; // Número de clientes para simular conexões
const messagesPerClient = 1000; // Número elevado de mensagens por cliente

const executionTimeInSeconds = 10;
const largeMessage = Buffer.from("A".repeat(messageSize));

// Função para enviar uma única mensagem CoAP
function sendMessage(clientId, messageId) {
  const req = coap.request({
    hostname: "192.168.1.75",
    pathname: path,
    method: "POST",
    confirmable: false, // Definindo como não confirmável para evitar esperar respostas
  });

  req.write(largeMessage);

  req.on("error", function (err) {
    console.error(`Error from client ${clientId}, message ${messageId}:`, err);
  });

  req.end();
}

// Função para iniciar a carga de mensagens para um único cliente
function startClient(clientId) {
  const endTime = Date.now() + executionTimeInSeconds * 1000;

  function sendMessagesContinuously() {
    for (let j = 0; j < messagesPerClient; j++) {
      sendMessage(clientId, j);
    }
    if (Date.now() < endTime) {
      setImmediate(sendMessagesContinuously);
    } else {
      process.exit(0);
    }
  }

  sendMessagesContinuously();
}

// Função principal para iniciar todos os clientes
function startLoadTest() {
  console.log(`Starting load test with ${numberOfClients} clients...`);

  for (let i = 0; i < numberOfClients; i++) {
    forkClient(i);
  }

  // Define um temporizador para parar o teste após o tempo definido
  setTimeout(function () {
    console.log(
      `Elapsed Time: ${executionTimeInSeconds} seconds - Stopping process`
    );
    process.exit();
  }, executionTimeInSeconds * 1000);
}

// Função para criar processos filhos para cada cliente
function forkClient(clientId) {
  const child = fork(__filename, ["client", clientId]);

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Client ${clientId} process exited with code ${code}`);
    }
  });
}

// Verifica se o processo atual é um processo filho
if (process.argv[2] === "client") {
  const clientId = parseInt(process.argv[3], 10);
  startClient(clientId);
} else {
  startLoadTest();
}
