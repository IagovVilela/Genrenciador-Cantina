import mqtt, { type MqttClient } from "mqtt";

export type RobotCommand = {
  pedidoId: string;
  slot: number;
  produto: string;
  acao: "ENTREGAR";
};

export type RobotStatusPayload = {
  pedidoId: string;
  status: "ACEITO" | "CONCLUIDO" | "FALHA";
  mensagem?: string;
};

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
export const MQTT_TOPIC_COMMAND =
  process.env.MQTT_TOPIC_COMMAND ?? "cantina/robo/comando";
export const MQTT_TOPIC_STATUS =
  process.env.MQTT_TOPIC_STATUS ?? "cantina/robo/status";

function buildOptions() {
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;
  return {
    username: username || undefined,
    password: password || undefined,
    reconnectPeriod: 2000,
    connectTimeout: 5000,
  };
}

export function createMqttClient(): MqttClient {
  return mqtt.connect(MQTT_URL, buildOptions());
}

export async function publishRobotCommand(
  command: RobotCommand,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const client = createMqttClient();
    const timer = setTimeout(() => {
      client.end(true);
      resolve({ ok: false, error: "Timeout ao conectar no broker MQTT" });
    }, 6000);

    client.on("connect", () => {
      client.publish(
        MQTT_TOPIC_COMMAND,
        JSON.stringify(command),
        { qos: 1 },
        (err) => {
          clearTimeout(timer);
          client.end(true);
          if (err) {
            resolve({ ok: false, error: err.message });
            return;
          }
          resolve({ ok: true });
        },
      );
    });

    client.on("error", (err) => {
      clearTimeout(timer);
      client.end(true);
      resolve({ ok: false, error: err.message });
    });
  });
}
