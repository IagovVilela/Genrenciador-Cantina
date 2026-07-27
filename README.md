# Genrenciador-Cantina

Sistema Cantina Robô — TCC SENAI.

Sistema de gerência de cantina escolar com pedido do aluno, saldo pré-pago / pagamento no balcão e disparo automático de um braço robótico (ESP32 + MQTT) quando o pedido fica **PAGO**.

## Stack

- Next.js (App Router) + TypeScript
- Prisma + SQLite (troque para PostgreSQL se quiser)
- NextAuth (credentials)
- MQTT (`mqtt` + Mosquitto / HiveMQ)
- Firmware de referência em `firmware/esp32_cantina_robo`

## Fluxo

1. Cantina recarrega o saldo do aluno **ou** o aluno deixa pedido pendente.
2. Pagamento por saldo (automático) ou confirmação no balcão → status `PAGO`.
3. Backend publica comando em `cantina/robo/comando` com `pedidoId` + `slot`.
4. ESP32 (ou simulador) entrega e publica `CONCLUIDO` em `cantina/robo/status`.
5. Pedido vai para `ENTREGUE`.

## Setup

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Contas seed (senha `123456`)

| Email | Papel |
|-------|--------|
| `aluno@cantina.local` | Aluno (matrícula `2026001`, saldo R$ 50) |
| `cantina@cantina.local` | Operador |
| `admin@cantina.local` | Admin |

## Robô / MQTT

1. Suba um broker local, por exemplo [Mosquitto](https://mosquitto.org/).
2. Em um terminal: `npm run robot:sim` (simula o braço).
3. Em outro (opcional se o sim já notifica a API): `npm run robot:bridge`.
4. Faça um pedido pago no app e acompanhe o status.

Sem broker, o pedido ainda fica `PAGO` e a mensagem indica falha de MQTT — o painel web continua usável.

### Firmware ESP32

Veja [`firmware/esp32_cantina_robo/esp32_cantina_robo.ino`](firmware/esp32_cantina_robo/esp32_cantina_robo.ino): configure Wi‑Fi, IP do broker e calibre os ângulos por slot.

## Variáveis (`.env`)

Copie de `.env.example`. Principais:

- `DATABASE_URL` — SQLite `file:./dev.db`
- `AUTH_SECRET` — segredo do NextAuth
- `MQTT_URL` — `mqtt://localhost:1883`
- `MQTT_TOPIC_COMMAND` / `MQTT_TOPIC_STATUS`

## Módulos

- `/cantina` — dashboard, pedidos, produtos/slots, alunos, recargas, status do robô
- `/aluno` — cardápio e histórico
- `POST /api/robot/status` — webhook HTTP alternativo para o simulador/ESP
