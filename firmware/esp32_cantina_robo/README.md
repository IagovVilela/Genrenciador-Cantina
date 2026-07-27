# Firmware ESP32 — Cantina Robô

1. Abra `esp32_cantina_robo.ino` na Arduino IDE (placa ESP32).
2. Instale as bibliotecas **PubSubClient** e **ArduinoJson**.
3. Ajuste Wi‑Fi, IP do broker MQTT e o mapa `slotAngle()`.
4. Faça upload e monitore o Serial (115200).

O ESP32 assina `cantina/robo/comando` e publica em `cantina/robo/status`.
