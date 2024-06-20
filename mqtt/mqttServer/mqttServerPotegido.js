const aedes = require("aedes")();
const net = require("net");

const port = 1883;

const MAX_CONNECTIONS = 1000; // Limite máximo de conexões simultâneas
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1 MB
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minuto em milissegundos
const MAX_PUBLISH_PER_CLIENT = 10; // Número máximo de publicações por cliente por minuto

const BLACKLIST_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos
const blacklist = {}; // Armazena os IPs bloqueados

// Contadores para rate limiting
const publishCounts = {};

// Middleware para limitar o número de conexões simultâneas
aedes.on("client", (client) => {
  if (Object.keys(aedes.clients).length > MAX_CONNECTIONS) {
    console.log("Número máximo de conexões atingido. Fechando conexão...");
    client.close();
  }
});

// Middleware para filtrar mensagens malformadas e verificar a blacklist
aedes.on("publish", (packet, client, cb) => {
  const ip = client && client.conn && client.conn.remoteAddress;
  if (packet.payload.length > MAX_PAYLOAD_SIZE) {
    console.log("Mensagem excedeu o tamanho máximo permitido. Descartando...");
    if (ip) addToBlacklist(ip);
    if (cb) cb(new Error("Payload size exceeded"));
    return;
  }
  if (ip && blacklist[ip]) {
    console.log(
      `IP ${ip} bloqueado devido a atividade suspeita. Descartando mensagem...`
    );
    if (cb) cb(new Error("Blocked IP"));
    return;
  }
  if (cb) cb();
});

// Middleware para rate limiting de publicações por cliente
aedes.on("publish", (packet, client, cb) => {
  if (!client || !client.id) return; // Verifica se o cliente está presente
  const clientId = client.id;
  const ip = client && client.conn && client.conn.remoteAddress;
  if (!publishCounts[clientId]) {
    publishCounts[clientId] = 0;
  }
  publishCounts[clientId]++;
  setTimeout(() => {
    publishCounts[clientId]--;
  }, RATE_LIMIT_PERIOD);

  if (publishCounts[clientId] > MAX_PUBLISH_PER_CLIENT) {
    console.log(
      `Cliente ${clientId} ultrapassou o limite de publicações. Fechando conexão...`
    );
    if (ip) addToBlacklist(ip);
    client.close();
    if (cb) cb(new Error("Publish rate limit exceeded"));
    return;
  }
  if (cb) cb();
});

// Configuração do servidor MQTT
const server = net.createServer(aedes.handle);

server.listen(port, function () {
  console.log("Aedes broker is running on port", port);
});

// Middleware para logs de conexão e desconexão
aedes.on("clientReady", (client) => {
  console.log(`Cliente conectado: ${client.id}`);
});

aedes.on("clientDisconnect", (client) => {
  console.log(`Cliente desconectado: ${client.id}`);
});

// Middleware para logs de assinaturas
aedes.on("subscribe", (subscriptions, client) => {
  subscriptions.forEach((sub) => {
    console.log(`Cliente ${client.id} subscrito ao tópico: ${sub.topic}`);
  });
});

aedes.on("unsubscribe", (subscriptions, client) => {
  subscriptions.forEach((sub) => {
    console.log(`Cliente ${client.id} desinscrito do tópico: ${sub.topic}`);
  });
});

// Função para adicionar um IP à blacklist
function addToBlacklist(ip) {
  console.log(
    `Adicionando IP ${ip} à blacklist por ${BLACKLIST_DURATION / 1000} segundos`
  );
  blacklist[ip] = true;
  setTimeout(() => {
    console.log(`Removendo IP ${ip} da blacklist`);
    delete blacklist[ip];
  }, BLACKLIST_DURATION);
}
