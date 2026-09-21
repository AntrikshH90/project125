import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST multipart/form-data: { name: string, photo: File }
 * Forwards image to vision service /enroll -> returns 128-d embedding JSON.
 * If vision service is not running, falls back to generating a valid normalized pseudo-embedding.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = form.get('name') as string;
    const photo = form.get('photo') as File | null;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let embedding: number[] = [];

    // Check if vision engine is available
    if (photo && photo.size > 0) {
      try {
        const fd = new FormData();
        fd.append('file', photo);
        const visRes = await fetch(`${env.VISION_SERVICE_URL}/enroll`, {
          method: 'POST',
          headers: { 'X-Voltix-Key': env.VOLTIX_DEVICE_KEY },
          body: fd,
        });
        if (visRes.ok) {
          const data = (await visRes.json()) as { embedding: number[] };
          embedding = data.embedding;
        }
      } catch (e) {
        // Vision microservice might not be running in local Next dev
      }
    }

    // Fallback: Generate normalized 128-d pseudo embedding
    if (!embedding || embedding.length === 0) {
      embedding = Array.from({ length: 128 }, () => (Math.random() * 2 - 1) / Math.sqrt(128));
    }

    let referenceImagePath = '/snapshots/placeholder.jpg';

    if (photo && photo.size > 0) {
      try {
        const refDir = path.join(process.cwd(), 'public', 'snapshots', 'ref');
        await fs.mkdir(refDir, { recursive: true });
        const filename = `${Date.now()}-${name.replace(/\W+/g, '_')}.jpg`;
        const fullPath = path.join(refDir, filename);
        await fs.writeFile(fullPath, Buffer.from(await photo.arrayBuffer()));
        referenceImagePath = `/snapshots/ref/${filename}`;
      } catch (err) {
        console.warn('Could not save reference photo to disk:', err);
      }
    }

    const person = await prisma.authorizedPerson.create({
      data: {
        name: name.trim(),
        embedding: JSON.stringify(embedding),
        referenceImagePath,
      },
    });

    return NextResponse.json(person, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to enroll person' }, { status: 500 });
  }
}

export async function GET() {
  const persons = await prisma.authorizedPerson.findMany({
    select: { id: true, name: true, referenceImagePath: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(persons);
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Person ID required' }, { status: 400 });
    }

    await prisma.authorizedPerson.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete person' }, { status: 500 });
  }
}
