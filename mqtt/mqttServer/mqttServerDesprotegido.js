const aedes = require("aedes")();
const net = require("net");
const Prometheus = require("prom-client");
const express = require("express");

const port = 1883;
const portMetrics = 3000;

// Coletar métricas padrão do sistema
const collectDefaultMetrics = Prometheus.collectDefaultMetrics;
collectDefaultMetrics();

// Métricas customizadas
const messagesReceivedCounter = new Prometheus.Counter({
  name: "mqtt_messages_received_total",
  help: "Total de mensagens recebidas pelo broker MQTT",
});

const connectionsCounter = new Prometheus.Counter({
  name: "mqtt_connections_total",
  help: "Total de conexões no broker MQTT",
});

// Criar servidor MQTT
const server = net.createServer(aedes.handle);

// Adicionar um listener para mensagens recebidas
aedes.on("publish", async function (packet, client) {
  if (client) {
    messagesReceivedCounter.inc();
    console.log(
      `Mensagem recebida de ${client.id}:`,
      packet.payload.toString()
    );
  }
});

// Adicionar um listener para novas conexões
aedes.on("client", function (client) {
  connectionsCounter.inc();
  console.log(`Cliente conectado: ${client.id}`);
});

server.listen(port, function () {
  console.log("Aedes broker is running on port", port);
});

// Configurar servidor HTTP para expor métricas Prometheus
const app = express();

app.get("/metrics", (req, res) => {
  res.set("Content-Type", Prometheus.register.contentType);
  res.end(Prometheus.register.metrics());
});

app.listen(portMetrics, () => {
  console.log(`Metrics server listening on port ${portMetrics}`);
});
