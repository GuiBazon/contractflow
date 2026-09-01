const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const { UPLOAD_ROOT, SUBDIRS } = require('../config/uploads');
const { obterContratoDono } = require('../services/contratoService');
const { registrarHistorico } = require('../services/historicoService');
const { ensureUploadDirs } = require('../config/uploads');

function caminhoSeguro(subdir, nomeArquivo) {
  const full = path.join(UPLOAD_ROOT, subdir, nomeArquivo);
  const root = path.join(UPLOAD_ROOT, subdir);
  if (!full.startsWith(root)) {
    throw new Object.assign(new Error('Caminho de arquivo inválido'), { status: 400 });
  }
  return full;
}

async function getDocumentoDono(documentoId, usuarioId) {
  const [rows] = await db.execute(
    `SELECT d.*
     FROM documentos d
     JOIN contratos c ON c.id = d.contrato_id
     JOIN clientes cl ON cl.id = c.cliente_id
     WHERE d.id = ? AND cl.usuario_id = ?`,
    [documentoId, usuarioId]
  );
  return rows[0] || null;
}

// Gera hash do arquivo para controle de integridade (RNF16)
function hashArquivo(caminho) {
  const buf = fs.readFileSync(caminho);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Upload de documento original (RF09) ou anexo (RF41)
const uploadDocumento = [
  (req, res, next) => {
    ensureUploadDirs();
    require('../config/uploads').buildUploader(SUBDIRS.DOCS, 'arquivo')(req, res, next);
  },
  require('../config/uploads').uploadSizeHandler,
  async (req, res) => {
    const { contratoId } = req.params;
    const tipo = String(req.body.tipo || 'ANEXO').toUpperCase();
    const descricao = String(req.body.descricao || '').trim();

    if (!['ORIGINAL', 'ANEXO'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de documento inválido' });
    }
    if (tipo === 'ORIGINAL' && !descricao) {
      // permite original sem descricao
    }

    try {
      const contrato = await obterContratoDono(contratoId, req.user.id);
      if (!contrato) {
        return res.status(404).json({ message: 'Contrato não encontrado' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }

      const caminho = path.join(SUBDIRS.DOCS, req.file.filename);
      const hash = hashArquivo(path.join(UPLOAD_ROOT, SUBDIRS.DOCS, req.file.filename));

      const [result] = await db.execute(
        `INSERT INTO documentos
         (contrato_id, usuario_id, nome_original, nome_arquivo, caminho, tipo, mime, tamanho, hash, descricao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contratoId,
          req.user.id,
          req.file.originalname,
          req.file.filename,
          caminho,
          tipo,
          req.file.mimetype,
          req.file.size,
          hash,
          descricao || (tipo === 'ORIGINAL' ? 'Documento original do contrato' : null),
        ]
      );

      await registrarHistorico(db, {
        contratoId: Number(contratoId),
        usuarioId: req.user.id,
        acao: 'DOCUMENTO',
        descricao: `${tipo === 'ORIGINAL' ? 'Documento original' : 'Anexo'} "${req.file.originalname}" adicionado`,
      });

      return res.status(201).json({
        message: 'Documento armazenado com sucesso',
        documento: {
          id: result.insertId,
          contrato_id: Number(contratoId),
          nome_original: req.file.originalname,
          tipo,
        },
      });
    } catch (error) {
      if (req.file) {
        fs.unlink(path.join(UPLOAD_ROOT, SUBDIRS.DOCS, req.file.filename), () => {});
      }
      console.error('erro ao armazenar documento:', error);
      return res.status(500).json({ message: 'Erro ao armazenar documento' });
    }
  },
];

async function listDocumentos(req, res) {
  const { contratoId } = req.params;

  try {
    const contrato = await obterContratoDono(contratoId, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const [rows] = await db.execute(
      `SELECT id, nome_original, tipo, mime, tamanho, descricao, created_at, hash
       FROM documentos
       WHERE contrato_id = ?
       ORDER BY tipo ASC, id ASC`,
      [contratoId]
    );

    return res.json({ contrato_id: Number(contratoId), data: rows });
  } catch (error) {
    console.error('erro ao listar documentos:', error);
    return res.status(500).json({ message: 'Erro ao listar documentos' });
  }
}

// Download do arquivo, somente para o dono (RF35 / RNF01)
async function downloadDocumento(req, res) {
  const { documentoId } = req.params;

  try {
    const documento = await getDocumentoDono(documentoId, req.user.id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    const caminho = caminhoSeguro(SUBDIRS.DOCS, documento.nome_arquivo);
    if (!fs.existsSync(caminho)) {
      return res.status(404).json({ message: 'Arquivo físico não encontrado' });
    }

    const mime = documento.mime || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${documento.nome_original.replace(/["\\]/g, '')}"`);
    return res.sendFile(caminho);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error('erro ao baixar documento:', error);
    return res.status(500).json({ message: 'Erro ao baixar documento' });
  }
}

async function deleteDocumento(req, res) {
  const { documentoId } = req.params;

  try {
    const documento = await getDocumentoDono(documentoId, req.user.id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    if (documento.tipo === 'ORIGINAL') {
      return res.status(400).json({ message: 'Documento original não pode ser removido (RN10/RN11)' });
    }

    await db.execute('DELETE FROM documentos WHERE id = ?', [documentoId]);

    fs.unlink(caminhoSeguro(SUBDIRS.DOCS, documento.nome_arquivo), () => {});

    return res.json({ message: 'Anexo removido com sucesso' });
  } catch (error) {
    console.error('erro ao remover documento:', error);
    return res.status(500).json({ message: 'Erro ao remover documento' });
  }
}

module.exports = {
  uploadDocumento,
  listDocumentos,
  downloadDocumento,
  deleteDocumento,
  getDocumentoDono,
};