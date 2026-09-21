/**
 * Voltix Home — Custom Node server.
 * Hosts: HTTP (Next.js), Socket.io, embedded Aedes MQTT broker, and Global 4G/5G Remote Tunnel Manager.
 * Run with: npx tsx server.ts (or npm start)
 */
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import Aedes from 'aedes';
import net from 'net';
import mqtt from 'mqtt';
import { prisma } from './lib/prisma';
import { registerMqttHandlers } from './lib/mqtt-handlers';
import { env } from './lib/env';
import { registerBridge } from './lib/face-bridge';
import { setTunnelSocketIO, getTunnelState, startCloudflareTunnel, stopTunnel } from './lib/tunnel-manager';

const port = env.PORT;
const dev = env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  /* ---------- 1. HTTP + Socket.IO ---------- */
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

  // Connect Tunnel Manager to Socket.IO
  setTunnelSocketIO(io);

  io.on('connection', (socket) => {
    // Send current tunnel state on connect
    socket.emit('tunnel:state', getTunnelState());

    socket.on('tunnel:toggle', async ({ action }: { action: 'start' | 'stop' }) => {
      if (action === 'start') {
        await startCloudflareTunnel(port);
      } else {
        stopTunnel();
      }
    });

    socket.on('appliance:set', async ({ id, state }: { id: string; state: boolean }) => {
      const appliance = await prisma.appliance.findUnique({ where: { id } });
      if (!appliance) return;
      
      // Update database state
      await prisma.appliance.update({
        where: { id },
        data: { currentState: state },
      });

      // Target the specific relay channel on the ESP32
      publish(`/voltix-dev`, `voltix/devices/${appliance.deviceId}/set`,
        JSON.stringify({ relay: appliance.relayChannel, state: state ? 'ON' : 'OFF', key: env.VOLTIX_DEVICE_KEY }));
      
      // Optimistic update pushed to all dashboards immediately
      io.emit('appliance:state', { id, state });
    });

    socket.on('appliance:batch', async ({ action }: { action: 'ALL_OFF' | 'ALL_ON' | 'AWAY_MODE' | 'HOME_MODE' }) => {
      const allAppliances = await prisma.appliance.findMany();
      if (action === 'ALL_OFF' || action === 'AWAY_MODE') {
        for (const app of allAppliances) {
          const shouldTurnOff = action === 'ALL_OFF' ? true : !app.name.toLowerCase().includes('fridge');
          if (shouldTurnOff && app.currentState) {
            await prisma.appliance.update({ where: { id: app.id }, data: { currentState: false } });
            publish(`/voltix-dev`, `voltix/devices/${app.deviceId}/set`,
              JSON.stringify({ relay: app.relayChannel, state: 'OFF', key: env.VOLTIX_DEVICE_KEY }));
            io.emit('appliance:state', { id: app.id, state: false });
          }
        }
      } else if (action === 'ALL_ON') {
        for (const app of allAppliances) {
          await prisma.appliance.update({ where: { id: app.id }, data: { currentState: true } });
          publish(`/voltix-dev`, `voltix/devices/${app.deviceId}/set`,
            JSON.stringify({ relay: app.relayChannel, state: 'ON', key: env.VOLTIX_DEVICE_KEY }));
          io.emit('appliance:state', { id: app.id, state: true });
        }
      }
    });

    socket.on('gate:override', async () => {
      publish('/voltix-dev', 'voltix/gate/set', JSON.stringify({ state: 'OPEN' }));
      
      const newLog = await prisma.accessLog.create({
        data: {
          status: 'GRANTED',
          confidence: 1.0,
          snapshotUrl: '/snapshots/manual-override.jpg',
          triggerSource: 'MANUAL_OVERRIDE',
        },
        include: { person: true },
      });
      io.emit('access:newlog', newLog);
    });
  });

  /* ---------- 2. Embedded Aedes MQTT Broker ---------- */
  const aedes = new Aedes();
  const tcpBroker = net.createServer(aedes.handle);
  tcpBroker.listen(env.MQTT_PORT, () => console.log(`🔌 MQTT broker on :${env.MQTT_PORT}`));

  const mqttx = mqtt.connect(`mqtt://127.0.0.1:${env.MQTT_PORT}`, { clientId: 'voltix-core' });
  const pendingTopics: Array<{ t: string; p: string }> = [];
  let connected = false;
  function publish(_: string, topic: string, payload: string) {
    if (connected) mqttx.publish(topic, payload, { qos: 1 });
    else pendingTopics.push({ t: topic, p: payload });
  }
  mqttx.on('connect', () => {
    connected = true;
    pendingTopics.forEach(({ t, p }) => mqttx.publish(t, p, { qos: 1 }));
  });

  const publishGateAuthorize = (payload: unknown) =>
    publish('', 'voltix/gate/authorize', JSON.stringify(payload));
  const publishGateSet = (payload: unknown) =>
    publish('', 'voltix/gate/set', JSON.stringify(payload));

  /* ---------- 3. Business logic for device traffic ---------- */
  registerMqttHandlers({
    aedes,
    io,
    secretKey: env.VOLTIX_DEVICE_KEY,
    prisma,
    publishGateAuthorize,
  });

  /* ---------- 4. Bridge for REST / Next routes ---------- */
  registerBridge({
    io,
    prisma,
    publishGateAuthorize,
    publishGateSet,
  });

  httpServer.listen(port, () => {
    console.log(`⚡ Voltix Home live on http://localhost:${port}`);
  });
});