const coap = require("coap");
const { performance } = require("perf_hooks");

const checkResponseTime = (target, interval) => {
  setInterval(() => {
    const start = performance.now();
    const req = coap.request(target);

    req.on("response", (res) => {
      const end = performance.now();
      const responseTime = Math.round(end - start); // Arredonda o tempo de resposta para o número inteiro mais próximo
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk.toString();
      });

      res.on("end", () => {
        console.log(`Response Time: ${responseTime}ms`);
        console.log(`Response Data: ${responseData}`);
        // Deixar o garbage collector cuidar da resposta
      });
    });

    req.on("error", (err) => {
      console.error(`Request failed: ${err.message}`);
    });

    req.end();
  }, interval);
};

const target = "coap://192.168.1.75";
const interval = 1000; // Intervalo de 1000ms (1 segundo) para verificar o tempo de resposta regularmente

checkResponseTime(target, interval);
