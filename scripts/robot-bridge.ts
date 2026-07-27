/**
 * Bridge contínuo: escuta cantina/robo/status e atualiza pedidos no banco.
 *
 * Uso: npm run robot:bridge
 */
import "dotenv/config";
import mqtt from "mqtt";
import { applyRobotStatus } from "../src/lib/orders";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS ?? "cantina/robo/status";

const client = mqtt.connect(MQTT_URL, {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
});

client.on("connect", () => {
  console.log(`[bridge] conectado em ${MQTT_URL}`);
  client.subscribe(TOPIC_STATUS, (err) => {
    if (err) {
      console.error("[bridge] falha ao assinar", err);
      return;
    }
    console.log(`[bridge] ouvindo ${TOPIC_STATUS}`);
  });
});

client.on("message", async (_topic, payload) => {
  try {
    const data = JSON.parse(payload.toString()) as {
      pedidoId: string;
      status: "ACEITO" | "CONCLUIDO" | "FALHA";
      mensagem?: string;
    };

    const order = await applyRobotStatus(data);
    if (!order) {
      console.warn("[bridge] pedido não encontrado", data.pedidoId);
      return;
    }
    console.log(
      `[bridge] pedido ${order.id} -> ${order.status} (${data.mensagem ?? ""})`,
    );
  } catch (error) {
    console.error("[bridge] erro ao processar", error);
  }
});

client.on("error", (err) => {
  console.error("[bridge] erro MQTT", err.message);
});

process.on("SIGINT", () => {
  client.end(true);
  process.exit(0);
});
