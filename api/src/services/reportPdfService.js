const PDFDocument = require('pdfkit');
const fontkit = require('fontkit');
const path = require('path');
const { HttpError } = require('../utils/http');
const fontPath = path.join(__dirname, '../assets/fonts/DejaVuSans.ttf');
const font = fontkit.openSync(fontPath);

function displayValue(value) {
  return value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
}

// Wait for a slow client before producing more pages. Removing listeners on every
// outcome prevents a disconnected client from leaving the report task running.
function waitForDrain(res) {
  if (res.destroyed) return Promise.reject(new Error('Download interrompido'));
  if (!res.writableNeedDrain) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      res.off('drain', drained);
      res.off('close', closed);
      res.off('error', failed);
    };
    const drained = () => { cleanup(); resolve(); };
    const closed = () => { cleanup(); reject(new Error('Download interrompido')); };
    const failed = err => { cleanup(); reject(err); };
    res.once('drain', drained);
    res.once('close', closed);
    res.once('error', failed);
    if (res.destroyed) closed();
  });
}

async function stream(res, tipo, rows, columns) {
  // Reject unsupported code points before starting the download instead of
  // silently replacing user data with missing-glyph symbols.
  for (const row of rows) {
    for (const key of columns) {
      for (const char of displayValue(row[key])) {
        const code = char.codePointAt(0);
        if (code > 0xffff || (code !== 9 && code !== 10 && code !== 13 && !font.hasGlyphForCodePoint(code))) {
          throw new HttpError(422, 'O PDF não suporta um ou mais caracteres neste relatório; use CSV ou XLSX');
        }
      }
    }
  }
  // Create the document before writing HTTP headers so construction errors can
  // still be reported by the normal API error handler.
  const doc = new PDFDocument({ size: 'A4', margin: 36, info: { Title: `ContractFlow - ${tipo}` } });
  doc.font(fontPath);
  doc.on('error', err => res.destroy(err));
  res.once('close', () => { if (!res.writableFinished) doc.destroy(); });
  res.setHeader('Content-Disposition', `attachment; filename="contractflow-${tipo.toLowerCase()}.pdf"`);
  res.type('application/pdf');
  doc.pipe(res);
  try {
    doc.font(fontPath).fontSize(15).text(`ContractFlow - Relatório ${tipo.toLowerCase()}`);
    doc.moveDown(0.4).font(fontPath).fontSize(9).text(`Registros: ${rows.length}`);
    doc.moveDown(0.5);
    if (!rows.length) {
      doc.text('Nenhum registro encontrado.');
      doc.moveDown(0.3).text(`Campos: ${columns.join(', ')}`);
    }
    for (let index = 0; index < rows.length; index++) {
      if (res.destroyed) throw new Error('Download interrompido');
      // One labelled record per paragraph keeps all columns legible even for
      // reports such as recebíveis, which do not fit on one landscape page.
      const text = columns.map(key => `${key}: ${displayValue(rows[index][key])}`).join('  |  ');
      doc.font(fontPath).fontSize(9).text(`Registro ${index + 1}`);
      doc.font(fontPath).fontSize(9).text(text, { lineGap: 1 });
      doc.moveDown(0.5);
      // Give the stream time to flush and honour network backpressure rather
      // than accumulating a complete 10,000-row PDF in memory.
      if (index % 25 === 0) {
        await new Promise(resolve => setImmediate(resolve));
        await waitForDrain(res);
      }
    }
    doc.end();
  } catch (err) {
    doc.unpipe(res);
    doc.destroy();
    if (res.headersSent) {
      res.destroy(err);
      return;
    }
    res.removeHeader('Content-Disposition');
    res.removeHeader('Content-Type');
    throw err;
  }
}

module.exports = { stream };
