const mqtt = require("mqtt");

// Configurações do broker MQTT
const brokerUrl = "mqtt://192.168.1.75:1883";
const topic = "test/latency";
const message = "Hello MQTT";
const checkInterval = 1000; // Intervalo de verificação em milissegundos

// Conecta ao broker MQTT
const client = mqtt.connect(brokerUrl);

let sendTime;
let lastReceiveTime;

// Função para enviar uma mensagem
function sendMessage() {
  sendTime = Date.now();
  console.log(`Enviando mensagem: ${message} às ${sendTime}`);
  client.publish(topic, message, (err) => {
    if (err) {
      console.error("Erro ao publicar a mensagem", err);
    }
  });
}

// Evento ao conectar ao broker
client.on("connect", () => {
  console.log("Conectado ao broker MQTT");
  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`Inscrito no tópico ${topic}`);
      // Inicia o envio de mensagens
      setInterval(() => {
        if (!lastReceiveTime || Date.now() - lastReceiveTime >= checkInterval) {
          sendMessage();
        } else {
          console.warn(
            "Ignorando envio, a última mensagem ainda está sendo processada."
          );
        }
      }, checkInterval);
    } else {
      console.error("Erro ao se inscrever no tópico", err);
    }
  });
});

// Evento ao receber uma mensagem
client.on("message", (receivedTopic, payload) => {
  if (receivedTopic === topic) {
    const receivedMessage = payload.toString();
    const receiveTime = Date.now();
    if (receivedMessage === message && sendTime !== undefined) {
      let latency = receiveTime - sendTime;
      console.log(`Tempo de resposta: ${latency} ms`);
      latency = 0;
      lastReceiveTime = receiveTime;
    }
  }
});

// Lida com erros de conexão
client.on("error", (err) => {
  console.error("Erro de conexão com o broker MQTT", err);
});

// Lida com desconexões
client.on("close", () => {
  console.log("Conexão com o broker MQTT fechada");
});

// Lida com tentativas de reconexão
client.on("reconnect", () => {
  console.log("Reconectando ao broker MQTT");
});
