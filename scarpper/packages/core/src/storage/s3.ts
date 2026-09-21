import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream, createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

function client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true";
  return new S3Client({
    ...(endpoint ? { endpoint, forcePathStyle } : {}),
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? ""
    }
  });
}

const BUCKET = () => process.env.S3_BUCKET ?? "dataharvest";

function localDir(): string {
  const dir = process.env.LOCAL_ARTIFACT_DIR ?? "./.data/artifacts";
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function putArtifact(key: string, body: Buffer): Promise<void> {
  try {
    await client().send(
      new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: body })
    );
  } catch (err) {
    const localPath = path.join(localDir(), key);
    mkdirSync(path.dirname(localPath), { recursive: true });
    writeFileSync(localPath, body);
    console.warn(`[storage] S3 unavailable, wrote artifact locally: ${localPath}`);
  }
}

export async function getArtifactBuffer(key: string): Promise<Buffer> {
  const res = await client().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
  const chunks: Buffer[] = [];
  const stream = res.Body as Readable;
  for await (const c of stream) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

export async function getArtifactStream(key: string): Promise<Readable> {
  const res = await client().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
  return res.Body as Readable;
}

export async function copyToLocal(key: string, destPath: string): Promise<boolean> {
  const localPath = path.join(localDir(), key);
  if (existsSync(localPath)) {
    await pipeline(createReadStream(localPath), createWriteStream(destPath));
    return true;
  }
  return false;
}

export async function presignDownload(key: string, filename: string, ttlSec = 3600): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`
  });
  return getSignedUrl(client(), cmd, { expiresIn: ttlSec });
}

export async function ensureBucket(): Promise<void> {
  try {
    await client().send(new HeadBucketCommand({ Bucket: BUCKET() }));
  } catch {
    console.warn("[storage] bucket not reachable yet; artifact writes will fall back to local disk");
  }
}

export function artifactLocalPath(key: string): string {
  return path.join(localDir(), key);
}
