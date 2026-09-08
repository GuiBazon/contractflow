// Controller de OCR (RF08-RF13 / RN09 / RN17 / RN18).
// O resultado da leitura e SEMPRE uma sugestao (status PENDENTE) e precisa de
// confirmacao do usuario (RN17). A confirmacao cria o contrato de verdade (RN09).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const {
  UPLOAD_ROOT, SUBDIRS, buildUploader, uploadSizeHandler, ensureUploadDirs,
} = require('../config/uploads');
const { extrairTextoDeArquivo, extrairDados } = require('../services/ocrService');
const { criarContratoComParcelas } = require('../services/contratoService');
const { registrarHistorico } = require('../services/historicoService');
const { onlyDigits, isValidCpfCnpj, str } = require('../utils/validators');

function hashArquivo(caminho) {
  const buf = fs.readFileSync(caminho);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function caminhoSeguro(subdir, nomeArquivo) {
  const full = path.join(UPLOAD_ROOT, subdir, nomeArquivo);
  const root = path.join(UPLOAD_ROOT, subdir);
  if (!full.startsWith(root)) {
    throw Object.assign(new Error('Caminho de arquivo inválido'), { status: 400 });
  }
  return full;
}

async function obterExtracao(id, usuarioId) {
  const [rows] = await db.execute(
    'SELECT * FROM extracao_ocr WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
  return rows[0] || null;
}

// Salva o arquivo original em uploads/ocr; o arquivo so e "aprovado" (ORIGINAL) na confirmacao.
function persistirNoBanco({ usuarioId, arquivo, textoExtraido, dados }) {
  const caminho = path.join(SUBDIRS.OCR, arquivo.filename);
  return db.execute(
    `INSERT INTO extracao_ocr
     (usuario_id, nome_original, nome_arquivo, caminho, tipo_arquivo, tamanho,
      texto_extraido, dados_json, confianca, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE')`,
    [
      usuarioId,
      arquivo.originalname,
      arquivo.filename,
      caminho,
      arquivo.mimetype,
      arquivo.size,
      textoExtraido,
      JSON.stringify(dados.dados || {}),
      dados.confianca || 0,
    ]
  );
}

// POST /api/ocr/extract (multipart 'arquivo')
const extract = [
  (req, res, next) => {
    ensureUploadDirs();
    buildUploader(SUBDIRS.OCR, 'arquivo')(req, res, next);
  },
  uploadSizeHandler,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }
    try {
      const caminho = caminhoSeguro(SUBDIRS.OCR, req.file.filename);
      const leitura = await extrairTextoDeArquivo({
        caminho,
        tipoArquivo: req.file.mimetype,
      });
      const sugestao = extrairDados(leitura.text);

      const [result] = await persistirNoBanco({
        usuarioId: req.user.id,
        arquivo: req.file,
        textoExtraido: leitura.text,
        dados: sugestao,
      });

      return res.status(201).json({
        extracao_id: result.insertId,
        dados: sugestao.dados,
        campos: sugestao.campos,
        confianca: sugestao.confianca,
        aviso: leitura.aviso || null,
      });
    } catch (error) {
      fs.unlink(caminhoSeguro(SUBDIRS.OCR, req.file.filename), () => {});
      const status = error.status || 500;
      console.error('erro ao extrair dados via OCR:', error);
      return res.status(status).json({ message: error.message || 'Erro ao processar o OCR' });
    }
  },
];

// GET /api/ocr/:id — retorna a extracao pendente/confirmada do usuário
async function getExtracao(req, res) {
  const { id } = req.params;
  try {
    const extracao = await obterExtracao(id, req.user.id);
    if (!extracao) {
      return res.status(404).json({ message: 'Extração não encontrada' });
    }
    return res.json({
      extracao_id: extracao.id,
      nome_original: extracao.nome_original,
      tipo_arquivo: extracao.tipo_arquivo,
      status: extracao.status,
      confianca: extracao.confianca,
      dados: extracao.dados_json || {},
    });
  } catch (error) {
    console.error('erro ao buscar extração:', error);
    return res.status(500).json({ message: 'Erro ao buscar extração' });
  }
}

// PATCH /api/ocr/:id — revisão/correção dos dados antes de confirmar (RF12/RF13/RN18)
async function updateExtracao(req, res) {
  const { id } = req.params;
  const dados = req.body.dados;
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return res.status(400).json({ message: 'Corpo deve conter o objeto "dados" revisado' });
  }
  try {
    const extracao = await obterExtracao(id, req.user.id);
    if (!extracao) {
      return res.status(404).json({ message: 'Extração não encontrada' });
    }
    if (extracao.status !== 'PENDENTE') {
      return res.status(400).json({ message: 'Extração já foi confirmada ou cancelada' });
    }
    await db.execute('UPDATE extracao_ocr SET dados_json = ? WHERE id = ?', [
      JSON.stringify(dados),
      id,
    ]);
    return res.json({ message: 'Dados revisados com sucesso', extracao_id: Number(id), dados });
  } catch (error) {
    console.error('erro ao revisar extração:', error);
    return res.status(500).json({ message: 'Erro ao revisar extração' });
  }
}

// Cria (ou resolve) o cliente com os dados revisados.
// cliente_id usa um cliente existente; cliente_novo recebe nome + cpf/cnpj.
async function resolverCliente({ usuarioId, dados }) {
  if (dados.cliente_id) {
    const [rows] = await db.execute(
      'SELECT id, nome_razao_social FROM clientes WHERE id = ? AND usuario_id = ?',
      [dados.cliente_id, usuarioId]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('Cliente selecionado não pertence a esta conta'), { status: 400 });
    }
    return rows[0].id;
  }

  if (dados.cliente_novo && str(dados.cliente_novo.nome_razao_social)) {
    const nome = str(dados.cliente_novo.nome_razao_social);
    const cpfCnpj = onlyDigits(dados.cliente_novo.cpf_cnpj || '');
    if (cpfCnpj && !isValidCpfCnpj(cpfCnpj).ok) {
      throw Object.assign(new Error('CPF/CNPJ do novo cliente é inválido'), { status: 400 });
    }
    const [result] = await db.execute(
      `INSERT INTO clientes (usuario_id, nome_razao_social, cpf_cnpj, observacoes)
       VALUES (?, ?, ?, ?)`,
      [usuarioId, nome, cpfCnpj || null, 'Cadastrado via importação de contrato']
    );
    return result.insertId;
  }

  throw Object.assign(new Error('Informe cliente_id ou cliente_novo para confirmar'), { status: 400 });
}

// POST /api/ocr/:id/confirmar — valida, cria cliente (se novo) e contrato+parcelas (RN09/RN17)
async function confirmar(req, res) {
  const { id } = req.params;
  const dados = req.body.dados;
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return res.status(400).json({ message: 'Corpo deve conter o objeto "dados" revisado' });
  }

  let extracao;
  try {
    extracao = await obterExtracao(id, req.user.id);
    if (!extracao) {
      return res.status(404).json({ message: 'Extração não encontrada' });
    }
    if (extracao.status !== 'PENDENTE') {
      return res.status(400).json({ message: 'Extração já foi confirmada ou cancelada' });
    }

    const clienteId = await resolverCliente({ usuarioId: req.user.id, dados });

    const valorTotal = dados.valor_total
      ?? (dados.valor_parcela && dados.quantidade_parcelas
        ? Number((Number(dados.valor_parcela) * Number(dados.quantidade_parcelas)).toFixed(2))
        : null);

    const payload = {
      cliente_id: clienteId,
      numero: dados.numero || `CTR-${new Date().getTime().toString().slice(-6)}`,
      tipo: dados.tipo || 'SERVIÇO',
      descricao: dados.descricao || 'Contrato importado por OCR',
      valor_total: valorTotal,
      data_inicio: dados.data_inicio || (dados.vencimentos && dados.vencimentos[0]) || null,
      data_fim: dados.data_fim || (dados.vencimentos && dados.vencimentos[dados.vencimentos.length - 1]) || null,
      vencimentos: Array.isArray(dados.vencimentos) && dados.vencimentos.length > 0 ? dados.vencimentos : undefined,
      quantidade_parcelas: Number(dados.quantidade_parcelas) || undefined,
      valor_parcela: dados.valor_parcela ? Number(dados.valor_parcela) : undefined,
      forma_pagamento: dados.forma_pagamento || 'PIX',
      juros_percentual: Number(dados.juros_percentual || 0),
      multa_percentual: Number(dados.multa_percentual || 0),
      status: 'ATIVO',
    };

    if (!payload.valor_total || payload.valor_total <= 0) {
      throw Object.assign(new Error('Valor total do contrato é obrigatório'), { status: 400 });
    }

    const { contrato, erro } = await criarContratoComParcelas({
      usuarioId: req.user.id,
      dados: payload,
    });
    if (erro) {
      const status = erro.status || 400;
      return res.status(status).json({ message: erro.message });
    }

    // move o arquivo de uploads/ocr para uploads/docs e associa como ORIGINAL (RN11)
    const origem = caminhoSeguro(SUBDIRS.OCR, extracao.nome_arquivo);
    const destinoArquivo = `${crypto.randomUUID()}${path.extname(extracao.nome_arquivo)}`;
    const destino = caminhoSeguro(SUBDIRS.DOCS, destinoArquivo);
    fs.renameSync(origem, destino);

    const conn = await db.getConnection();
    try {
      await conn.execute(
        `INSERT INTO documentos
         (contrato_id, usuario_id, nome_original, nome_arquivo, caminho, tipo, mime, tamanho, hash, descricao)
         VALUES (?, ?, ?, ?, ?, 'ORIGINAL', ?, ?, ?, ?)`,
        [
          contrato.id,
          req.user.id,
          extracao.nome_original,
          destinoArquivo,
          path.join(SUBDIRS.DOCS, destinoArquivo),
          extracao.tipo_arquivo,
          extracao.tamanho,
          hashArquivo(destino),
          'Documento original importado por OCR',
        ]
      );
      await registrarHistorico(conn, {
        contratoId: contrato.id,
        usuarioId: req.user.id,
        acao: 'DOCUMENTO',
        descricao: 'Documento original importado por OCR confirmado',
      });
      await conn.commit();
      conn.release();
    } catch (error) {
      if (conn) {
        await conn.rollback().catch(() => {});
        conn.release();
      }
      throw error;
    }

    await db.execute("UPDATE extracao_ocr SET status = 'CONFIRMADA' WHERE id = ?", [id]);

    return res.status(201).json({
      message: 'Contrato confirmado e criado com sucesso',
      contrato_id: contrato.id,
      numero: contrato.numero,
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('erro ao confirmar extração:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe um contrato com esses dados' });
    }
    return res.status(status).json({ message: error.message || 'Erro ao confirmar extração' });
  }
}

// DELETE /api/ocr/:id — cancela a extração e apaga o arquivo
async function cancelarExtracao(req, res) {
  const { id } = req.params;
  try {
    const extracao = await obterExtracao(id, req.user.id);
    if (!extracao) {
      return res.status(404).json({ message: 'Extração não encontrada' });
    }
    if (extracao.status !== 'PENDENTE') {
      return res.status(400).json({ message: 'Extração já foi confirmada ou cancelada' });
    }
    await db.execute("UPDATE extracao_ocr SET status = 'CANCELADA' WHERE id = ?", [id]);
    fs.unlink(caminhoSeguro(SUBDIRS.OCR, extracao.nome_arquivo), () => {});
    return res.json({ message: 'Extração cancelada' });
  } catch (error) {
    console.error('erro ao cancelar extração:', error);
    return res.status(500).json({ message: 'Erro ao cancelar extração' });
  }
}

module.exports = {
  extract,
  getExtracao,
  updateExtracao,
  confirmar,
  cancelarExtracao,
};