import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  VOLTIX_DEVICE_KEY: z.string().min(16, 'Device key must be >= 16 chars'),
  ADMIN_EMAIL: z.string().email().default('admin@voltix.local'),
  ADMIN_PASSWORD: z.string().min(8),
  CAM_STREAM_URL: z.string().url().default('http://192.168.1.60:81/stream'),
  VISION_SERVICE_URL: z.string().url().default('http://127.0.0.1:8000'),
  PORT: z.coerce.number().default(3000),
  MQTT_PORT: z.coerce.number().default(1883),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid .env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;