import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Seeds the 8 appliance channels + authorized persons + access history + admin user.
 */
async function main() {
  const relayBoard = 'voltix-relay-01'; // must match DEVICE_ID in firmware

  const appliances = [
    { relayChannel: 0, name: 'Living Room Chandelier', room: 'LIVING_ROOM', powerWatts: 60, currentState: true, online: true },
    { relayChannel: 1, name: '4K TV & Soundbar',      room: 'LIVING_ROOM', powerWatts: 150, currentState: false, online: true },
    { relayChannel: 2, name: 'Inverter Dual AC 1.5T',  room: 'BEDROOM',     powerWatts: 1650, currentState: true, online: true },
    { relayChannel: 3, name: 'Fast Water Heater / Geyser', room: 'BATHROOM', powerWatts: 2000, currentState: false, online: true },
    { relayChannel: 4, name: 'Kitchen Smart Fridge',   room: 'KITCHEN',     powerWatts: 220, currentState: true, online: true },
    { relayChannel: 5, name: 'Microwave & Oven Point', room: 'KITCHEN',     powerWatts: 1200, currentState: false, online: true },
    { relayChannel: 6, name: 'Turbo Exhaust Fan',      room: 'KITCHEN',     powerWatts: 45, currentState: false, online: true },
    { relayChannel: 7, name: 'Garage Floodlight & Charger', room: 'GARAGE', powerWatts: 180, currentState: false, online: true },
  ] as const;

  for (const a of appliances) {
    await prisma.appliance.upsert({
      where: { deviceId_relayChannel: { deviceId: relayBoard, relayChannel: a.relayChannel } },
      update: {
        name: a.name,
        room: a.room,
        powerWatts: a.powerWatts,
        online: true,
      },
      create: { ...a, deviceId: relayBoard },
    });
  }

  // Seed sample authorized persons
  const mockEmbedding = JSON.stringify(Array.from({ length: 128 }, () => 0.05));
  
  let person1 = await prisma.authorizedPerson.findFirst({ where: { name: 'Antriksh (Owner)' } });
  if (!person1) {
    person1 = await prisma.authorizedPerson.create({
      data: {
        name: 'Antriksh (Owner)',
        embedding: mockEmbedding,
        referenceImagePath: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
    });
  }

  let person2 = await prisma.authorizedPerson.findFirst({ where: { name: 'Priya (Family)' } });
  if (!person2) {
    person2 = await prisma.authorizedPerson.create({
      data: {
        name: 'Priya (Family)',
        embedding: mockEmbedding,
        referenceImagePath: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      },
    });
  }

  // Seed realistic historical access logs for trend charts
  const existingLogsCount = await prisma.accessLog.count();
  if (existingLogsCount < 10) {
    const now = Date.now();
    const sampleEvents = [
      { personId: person1.id, status: 'GRANTED', confidence: 0.98, offsetMins: 12, trigger: 'FACE_SCAN', img: person1.referenceImagePath },
      { personId: person2.id, status: 'GRANTED', confidence: 0.95, offsetMins: 45, trigger: 'FACE_SCAN', img: person2.referenceImagePath },
      { personId: null, status: 'DENIED_UNKNOWN', confidence: 0.22, offsetMins: 110, trigger: 'FACE_SCAN', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
      { personId: person1.id, status: 'GRANTED', confidence: 1.0, offsetMins: 190, trigger: 'MANUAL_OVERRIDE', img: person1.referenceImagePath },
      { personId: null, status: 'DENIED_LOW_CONFIDENCE', confidence: 0.68, offsetMins: 320, trigger: 'FACE_SCAN', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
      { personId: person1.id, status: 'GRANTED', confidence: 0.97, offsetMins: 720, trigger: 'FACE_SCAN', img: person1.referenceImagePath },
      { personId: person2.id, status: 'GRANTED', confidence: 0.94, offsetMins: 1440, trigger: 'FACE_SCAN', img: person2.referenceImagePath },
      { personId: null, status: 'DENIED_UNKNOWN', confidence: 0.31, offsetMins: 2880, trigger: 'FACE_SCAN', img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
    ];

    for (const ev of sampleEvents) {
      await prisma.accessLog.create({
        data: {
          timestamp: new Date(now - ev.offsetMins * 60 * 1000),
          personId: ev.personId,
          status: ev.status,
          confidence: ev.confidence,
          snapshotUrl: ev.img,
          triggerSource: ev.trigger,
        },
      });
    }
  }

  // Admin user
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@voltix.local' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@voltix.local',
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD || 'changeme123'),
      role: 'ADMIN',
    },
  });

  console.log('✅ Seeded 8 appliances + authorized persons + access logs + admin user');
}

function hashPassword(pw: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(pw, salt, 64, (err, key) =>
      err ? reject(err) : resolve(`scrypt:$${salt}$${key.toString('hex')}`));
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());