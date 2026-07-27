/**
 * Simulador do braço robótico.
 * Assina cantina/robo/comando e responde CONCLUIDO após alguns segundos.
 *
 * Uso: npm run robot:sim
 * Requer um broker MQTT (ex.: mosquitto) em MQTT_URL.
 */
import "dotenv/config";
import mqtt from "mqtt";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const TOPIC_COMMAND = process.env.MQTT_TOPIC_COMMAND ?? "cantina/robo/comando";
const TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS ?? "cantina/robo/status";
const DELAY_MS = Number(process.env.ROBOT_SIM_DELAY_MS ?? 3000);
const API_URL = process.env.ROBOT_STATUS_API_URL ?? "http://localhost:3000/api/robot/status";

type Command = {
  pedidoId: string;
  slot: number;
  produto: string;
  acao: string;
};

const client = mqtt.connect(MQTT_URL, {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
});

client.on("connect", () => {
  console.log(`[sim] conectado em ${MQTT_URL}`);
  client.subscribe(TOPIC_COMMAND, (err) => {
    if (err) {
      console.error("[sim] falha ao assinar", err);
      return;
    }
    console.log(`[sim] ouvindo ${TOPIC_COMMAND}`);
  });
});

client.on("message", async (topic, payload) => {
  if (topic !== TOPIC_COMMAND) return;

  let command: Command;
  try {
    command = JSON.parse(payload.toString()) as Command;
  } catch {
    console.error("[sim] payload inválido", payload.toString());
    return;
  }

  console.log(
    `[sim] comando recebido pedido=${command.pedidoId} slot=${command.slot} produto=${command.produto}`,
  );

  const accepted = {
    pedidoId: command.pedidoId,
    status: "ACEITO" as const,
    mensagem: `Simulador indo ao slot ${command.slot}`,
  };
  client.publish(TOPIC_STATUS, JSON.stringify(accepted));
  await postStatus(accepted);

  setTimeout(async () => {
    const done = {
      pedidoId: command.pedidoId,
      status: "CONCLUIDO" as const,
      mensagem: `Simulador entregou ${command.produto}`,
    };
    client.publish(TOPIC_STATUS, JSON.stringify(done));
    await postStatus(done);
    console.log(`[sim] entrega concluída ${command.pedidoId}`);
  }, DELAY_MS);
});

client.on("error", (err) => {
  console.error("[sim] erro MQTT", err.message);
});

async function postStatus(body: {
  pedidoId: string;
  status: "ACEITO" | "CONCLUIDO" | "FALHA";
  mensagem?: string;
}) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn("[sim] API status HTTP", res.status, await res.text());
    }
  } catch (error) {
    console.warn(
      "[sim] não foi possível notificar a API (ok se o bridge estiver rodando):",
      error instanceof Error ? error.message : error,
    );
  }
}
