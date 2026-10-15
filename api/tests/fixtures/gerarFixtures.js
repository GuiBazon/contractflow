// Gera fixtures REAIS para os testes do OCR (sem mock, sem resposta simulada).
//   PDF digital  -> pdfkit com texto selecionavel
//   PDF escaneado-> pdfkit embutindo uma IMAGEM (sem camada de texto)
//   JPG / PNG    -> imagem renderizada do mesmo conteudo
// As imagens passam por um "degrau" (ruido + leve rotacao) para simular
// foto de celular, que e o caso de uso real.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

const DIR = __dirname;

const CONTRATO = {
  numero: 'CTR-2026-001',
  cliente: 'MARIA APARECIDA SOUZA',
  cpfCnpj: '529.982.247-25',
  valorTotal: 'R$ 24.000,00',
  parcelas: '12',
  valorParcela: 'R$ 2.000,00',
  vencimentos: ['10/03/2026', '10/04/2026', '10/05/2026', '10/06/2026'],
  formaPagamento: 'PIX',
  juros: '1,5',
  multa: '2',
  tipo: 'PRESTACAO DE SERVICOS',
};

const CPF_INVALIDO = '111.222.333-44';

function linhasDoDocumento({ cpfCnpj = CONTRATO.cpfCnpj, semTotal = false } = {}) {
  return [
    'CONTRATO DE PRESTACAO DE SERVICOS',
    '',
    `Cliente: ${CONTRATO.cliente}`,
    `CPF: ${cpfCnpj}`,
    `Numero do contrato: ${CONTRATO.numero}`,
    '',
    ...(semTotal ? [] : [`Valor total do contrato: ${CONTRATO.valorTotal}`]),
    `${CONTRATO.parcelas} parcelas de ${CONTRATO.valorParcela}`,
    `Vencimentos: ${CONTRATO.vencimentos.join(', ')}`,
    `Forma de pagamento: ${CONTRATO.formaPagamento}`,
    `Juros de ${CONTRATO.juros}% ao mes. Multa de ${CONTRATO.multa}%`,
  ];
}

function escreverPdf(destino, { imagem = false, bufferImagem = null, cpfCnpj, semTotal } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(destino);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);

    if (imagem) {
      // PDF escaneado: e so uma imagem. Nao existe camada de texto.
      doc.image(bufferImagem, 50, 50, { width: 495, height: 700 });
    } else {
      doc.font('Helvetica-Bold').fontSize(16).text('CONTRATO DE PRESTACAO DE SERVICOS', { align: 'center' });
      doc.moveDown(1.5);
      doc.font('Helvetica').fontSize(11);
      for (const linha of linhasDoDocumento({ cpfCnpj, semTotal })) {
        doc.text(linha || ' ');
      }
    }
    doc.end();
  });
}

// imagem com degradê/ruido para simular foto de celular
async function renderizarImagem({ arquivo, tipo, largura = 1700, altura = 2200, degrau = true }) {
  const textoLinhas = linhasDoDocumento()
    .map(
      (linha) =>
        `<tspan x="110" dy="42">${linha
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</tspan>`
    )
    .join('');

  const svg = `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
    <feColorMatrix type="saturate" values="0"/></filter>
    <pattern id="g" width="100%" height="100%"><rect width="100%" height="100%" filter="url(#grain)" opacity="0.10"/></pattern>
  </defs>
  <rect width="100%" height="100%" fill="${degrau ? '#e8e6e0' : '#ffffff'}"/>
  ${degrau ? '<rect x="0" y="0" width="100%" height="100%" fill="url(#g)"/>' : ''}
  <g font-family="DejaVu Sans, Helvetica, sans-serif" fill="${degrau ? '#1a1a1a' : '#000000'}" font-size="27">
    <text x="${largura / 2}" y="150" font-size="34" font-weight="bold" text-anchor="middle">CONTRATO DE PRESTACAO DE SERVICOS</text>
    <text x="110" y="300">${textoLinhas}</text>
  </g>
</svg>`;

  let pipeline = sharp(Buffer.from(svg));
  if (degrau) {
    // leve desfoque + ruido, como uma foto de celular
    pipeline = pipeline.blur(0.6).modulate({ brightness: 0.97 }).jpeg({ quality: 82 });
  }
  await pipeline.toFile(arquivo);
  return arquivo;
}

async function gerar() {
  fs.mkdirSync(DIR, { recursive: true });
  const arquivos = {};

  // 1. PDF digital (camada de texto)
  arquivos.pdfDigital = path.join(DIR, 'contrato-digital.pdf');
  await escreverPdf(arquivos.pdfDigital, {});

  // 2. PDF escaneado (so imagem)
  const imgEscaneada = path.join(DIR, '_tmp-escanada.png');
  await renderizarImagem({ arquivo: imgEscaneada, tipo: 'png', degrau: true });
  const bufferEscaneada = fs.readFileSync(imgEscaneada);
  arquivos.pdfEscaneado = path.join(DIR, 'contrato-escaneado.pdf');
  await escreverPdf(arquivos.pdfEscaneado, { imagem: true, bufferImagem: bufferEscaneada });
  fs.unlinkSync(imgEscaneada);

  // 3. Imagens limpas
  arquivos.jpg = path.join(DIR, 'contrato.jpg');
  await renderizarImagem({ arquivo: arquivos.jpg, tipo: 'jpeg', degrau: false });
  arquivos.png = path.join(DIR, 'contrato.png');
  await renderizarImagem({ arquivo: arquivos.png, tipo: 'png', degrau: false });

  // 4. "Foto de celular" (JPEG com ruido) - o caso mais duro
  arquivos.fotoCelular = path.join(DIR, 'contrato-foto-celular.jpg');
  await renderizarImagem({ arquivo: arquivos.fotoCelular, tipo: 'jpeg', degrau: true });

  // 5. PDF digital com CPF invalido
  arquivos.pdfCpfInvalido = path.join(DIR, 'contrato-cpf-invalido.pdf');
  await escreverPdf(arquivos.pdfCpfInvalido, { cpfCnpj: CPF_INVALIDO });

  // 6. PDF digital incompleto (sem valor total)
  arquivos.pdfIncompleto = path.join(DIR, 'contrato-incompleto.pdf');
  await escreverPdf(arquivos.pdfIncompleto, { semTotal: true });

  // 7. PDF com 30 paginas (testa o limite de paginas)
  arquivos.pdfMuitoPaginas = path.join(DIR, 'contrato-30-paginas.pdf');
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(arquivos.pdfMuitoPaginas);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);
    for (let i = 1; i <= 30; i++) {
      doc.font('Helvetica').fontSize(11).text(`Pagina ${i} - CONTRATO DE PRESTACAO DE SERVICOS`, 50, 50);
      doc.text(`Cliente: ${CONTRATO.cliente}`);
      doc.text(`Numero do contrato: CTR-2026-${String(i).padStart(3, '0')}`);
      doc.addPage();
    }
    doc.end();
  });

  // 8. Arquivo invalido (nao e PDF nem imagem)
  arquivos.invalido = path.join(DIR, 'nao-e-documento.txt');
  fs.writeFileSync(arquivos.invalido, 'isso nao e um pdf nem uma imagem valida para OCR');

  // 9. Arquivo grande (> 10MB) para o teste de limite de tamanho.
  // Usa ruido REAL (bytes pseudoaleatorios): nao comprime, entao o arquivo
  // realmente ultrapassa o limite de 10MB do multer.
  arquivos.grande = path.join(DIR, 'grande.jpg');
  const LADO = 3200; // JPEG quality 100 de ruido puro fica ~2:1 -> ~15MB
  const pixels = Buffer.alloc(LADO * LADO * 3);
  let semente = 0x9e3779b9;
  for (let i = 0; i < pixels.length; i++) {
    // xorshift32: ruido de verdade, nao comprime
    semente ^= semente << 13; semente >>>= 0;
    semente ^= semente >>> 17;
    semente ^= semente << 5; semente >>>= 0;
    pixels[i] = semente & 0xff;
  }
  await sharp(pixels, { raw: { width: LADO, height: LADO, channels: 3 } })
    .jpeg({ quality: 100 })
    .toFile(arquivos.grande);

  return arquivos;
}

if (require.main === module) {
  gerar()
    .then((a) => {
      for (const [k, v] of Object.entries(a)) {
        console.log(`${k.padEnd(20)} ${path.basename(v).padEnd(32)} ${(fs.statSync(v).size / 1024).toFixed(1)} KB`);
      }
    })
    .catch((e) => {
      console.error('falha ao gerar fixtures:', e);
      process.exit(1);
    });
}

module.exports = { gerar, DIR, CONTRATO };
