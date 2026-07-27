/*
 * Firmware de referência para ESP32 (Arduino IDE / PlatformIO)
 * Bibliotecas: WiFi, PubSubClient, ArduinoJson, ESP32Servo (se usar servos)
 *
 * Fluxo:
 * 1) Conecta no Wi-Fi
 * 2) Conecta no broker MQTT
 * 3) Assina cantina/robo/comando
 * 4) Move o braço até o slot, entrega e publica CONCLUIDO em cantina/robo/status
 *
 * Calibre SLOT_ANGLES conforme o seu braço físico.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ====== CONFIGURE AQUI ======
const char* WIFI_SSID = "SUA_REDE";
const char* WIFI_PASS = "SUA_SENHA";
const char* MQTT_HOST = "192.168.1.10"; // IP do PC/Raspberry com Mosquitto
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER = "";
const char* MQTT_PASS_BROKER = "";
const char* TOPIC_COMMAND = "cantina/robo/comando";
const char* TOPIC_STATUS = "cantina/robo/status";
// ============================

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// Mapa slot -> ângulo base (exemplo). Ajuste na bancada.
int slotAngle(int slot) {
  switch (slot) {
    case 1: return 30;
    case 2: return 60;
    case 3: return 90;
    case 4: return 120;
    default: return 90;
  }
}

void publishStatus(const char* pedidoId, const char* status, const char* mensagem) {
  StaticJsonDocument<256> doc;
  doc["pedidoId"] = pedidoId;
  doc["status"] = status;
  doc["mensagem"] = mensagem;
  char buffer[256];
  size_t n = serializeJson(doc, buffer);
  mqtt.publish(TOPIC_STATUS, buffer, n);
}

void moveArmToSlot(int slot) {
  int angle = slotAngle(slot);
  // TODO: substituir por controle real de servos/steppers
  // Ex.: servoBase.write(angle);
  Serial.printf("[braco] movendo para slot %d (angulo %d)\n", slot, angle);
  delay(1500);
}

void deliverSequence(int slot, const char* produto) {
  Serial.printf("[braco] pegando %s no slot %d\n", produto, slot);
  moveArmToSlot(slot);
  delay(800); // "pegar"
  Serial.println("[braco] indo ao ponto de entrega");
  delay(1200);
  Serial.println("[braco] soltando item");
  delay(500);
  Serial.println("[braco] voltando home");
  delay(800);
}

void handleCommand(char* payload) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.println("[mqtt] JSON inválido");
    return;
  }

  const char* pedidoId = doc["pedidoId"] | "";
  int slot = doc["slot"] | 0;
  const char* produto = doc["produto"] | "item";
  const char* acao = doc["acao"] | "";

  if (strlen(pedidoId) == 0 || slot <= 0 || strcmp(acao, "ENTREGAR") != 0) {
    Serial.println("[mqtt] comando incompleto");
    return;
  }

  publishStatus(pedidoId, "ACEITO", "ESP32 iniciou entrega");
  deliverSequence(slot, produto);
  publishStatus(pedidoId, "CONCLUIDO", "ESP32 concluiu entrega");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.printf("[mqtt] %s => %s\n", topic, message);
  if (strcmp(topic, TOPIC_COMMAND) == 0) {
    handleCommand(message);
  }
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[wifi] conectando");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("[wifi] IP ");
  Serial.println(WiFi.localIP());
}

void ensureMqtt() {
  while (!mqtt.connected()) {
    Serial.println("[mqtt] conectando...");
    String clientId = "cantina-esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    bool ok;
    if (strlen(MQTT_USER) > 0) {
      ok = mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS_BROKER);
    } else {
      ok = mqtt.connect(clientId.c_str());
    }
    if (ok) {
      Serial.println("[mqtt] ok");
      mqtt.subscribe(TOPIC_COMMAND);
    } else {
      Serial.print("[mqtt] falha rc=");
      Serial.println(mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  ensureWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  ensureMqtt();
}

void loop() {
  ensureWifi();
  ensureMqtt();
  mqtt.loop();
}
