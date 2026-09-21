// Resume Adjuster — Node server: serves the static app + handles PDF/DOCX upload parsing.
// PDF text extraction runs server-side with pdf-parse (more reliable than browser PDF.js for
// resumes that mix fonts/columns), DOCX with mammoth. The browser-side parser handles the
// file when the user works fully offline; the server is here for the heavy lifting.

import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB cap
});

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

process.on('uncaughtException', e => console.error('UNCAUGHT', e));
process.on('unhandledRejection', e => console.error('UNHANDLED', e));

app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { mimetype, buffer, originalname } = req.file;
    console.log('parse request:', originalname, mimetype, buffer.length);
    let text = '';
    let method = '';

    if (mimetype === 'application/pdf' || /\.pdf$/i.test(originalname)) {
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
      method = 'pdf-parse';
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.docx$/i.test(originalname)
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
      method = 'mammoth';
    } else if (mimetype === 'text/plain' || /\.txt$/i.test(originalname)) {
      text = buffer.toString('utf8');
      method = 'plain';
    } else {
      return res.status(415).json({ error: `Unsupported file type: ${mimetype || 'unknown'}` });
    }

    res.json({
      ok: true,
      method,
      filename: originalname,
      bytes: buffer.length,
      text: text.replace(/\u0000/g, '').trim()
    });
    console.log('parse ok:', method, text.length, 'chars');
  } catch (err) {
    console.error('parse error', err);
    res.status(500).json({ error: err.message || 'Parse failed' });
  }
});

const PORT = process.env.PORT || 4173;
app.listen(PORT, () => {
  console.log(`Resume Adjuster running → http://localhost:${PORT}`);
});
