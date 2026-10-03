const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const { UPLOAD_ROOT, SUBDIRS, buildUploader, uploadSizeHandler, ensureUploadDirs } = require('../config/uploads');
const { extrairTextoDeArquivo, extrairDados } = require('../services/ocrService');
const { criarContratoComParcelas } = require('../services/contratoService');
const { registrarHistorico } = require('../services/historicoService');
const { onlyDigits, isValidCpfCnpj, str } = require('../utils/validators');
const { integer } = require('../utils/query');
const { HttpError, asyncHandler } = require('../utils/http');

function safePath(subdir, filename) {
  const root = path.resolve(UPLOAD_ROOT, subdir);
  const full = path.resolve(root, filename);
  if (path.relative(root, full).startsWith('..') || path.isAbsolute(path.relative(root, full))) throw new HttpError(400, 'Caminho de arquivo inválido');
  return full;
}

function reviewed(body) {
  const dados = body.dados ?? body.dados_json;
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new HttpError(400, 'Corpo deve conter o objeto "dados" revisado');
  const allowed = new Set(['cliente_id','cliente_novo','cliente_nome','cpf_cnpj','numero','tipo','descricao','valor_total','valor_parcela','quantidade_parcelas','data_inicio','data_fim','vencimentos','forma_pagamento','juros_percentual','multa_percentual','observacoes']);
  if (Object.keys(dados).some(k => !allowed.has(k))) throw new HttpError(400, 'Campo não permitido na revisão');
  return dados;
}

async function owned(conn, id, usuarioId, lock = false) {
  const [[row]] = await conn.query(`SELECT * FROM extracao_ocr WHERE id = ? AND usuario_id = ?${lock ? ' FOR UPDATE' : ''}`, [integer(id, 'Extração'), usuarioId]);
  if (!row) throw new HttpError(404, 'Extração não encontrada');
  return row;
}

const extract = [
  (req, res, next) => { ensureUploadDirs(); buildUploader(SUBDIRS.OCR, 'arquivo')(req, res, next); },
  uploadSizeHandler,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Nenhum arquivo enviado');
    const filename = safePath(SUBDIRS.OCR, req.file.filename);
    try {
      const leitura = await extrairTextoDeArquivo({ caminho: filename, tipoArquivo: req.file.mimetype });
      const sugestao = extrairDados(leitura.text);
      const [result] = await db.execute(`INSERT INTO extracao_ocr
       (usuario_id,nome_original,nome_arquivo,caminho,tipo_arquivo,tamanho,texto_extraido,dados_json,confianca,status)
       VALUES (?,?,?,?,?,?,?,?,?,'PENDENTE')`, [req.user.id, req.file.originalname, req.file.filename, path.join(SUBDIRS.OCR, req.file.filename), req.file.mimetype, req.file.size, leitura.text, JSON.stringify(sugestao.dados), sugestao.confianca]);
      res.status(201).json({ extracao_id: result.insertId, dados: sugestao.dados, campos: sugestao.campos, confianca: sugestao.confianca,
        aviso: leitura.aviso || (sugestao.campos.length < 3 ? 'Poucos campos identificados; revise e preencha os dados antes de confirmar.' : null) });
    } catch (err) { await fs.unlink(filename).catch(() => {}); throw err; }
  }),
];

async function getExtracao(req, res) {
  const row = await owned(db, req.params.id, req.user.id);
  res.json({ extracao_id: row.id, nome_original: row.nome_original, tipo_arquivo: row.tipo_arquivo, status: row.status, confianca: Number(row.confianca), dados: row.dados_json || {} });
}

async function updateExtracao(req, res) {
  const dados = reviewed(req.body);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const row = await owned(conn, req.params.id, req.user.id, true);
    if (row.status !== 'PENDENTE') throw new HttpError(409, 'Extração já foi confirmada ou cancelada');
    await conn.execute('UPDATE extracao_ocr SET dados_json = ? WHERE id = ?', [JSON.stringify(dados), row.id]);
    await conn.commit();
    res.json({ message: 'Dados revisados com sucesso', extracao_id: row.id, dados });
  } catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}

async function resolveClient(conn, usuarioId, dados) {
  if (dados.cliente_id !== undefined) {
    const [[client]] = await conn.query('SELECT id FROM clientes WHERE id = ? AND usuario_id = ?', [integer(dados.cliente_id, 'Cliente'), usuarioId]);
    if (!client) throw new HttpError(400, 'Cliente selecionado não pertence a esta conta');
    return client.id;
  }
  const name = str(dados.cliente_novo?.nome_razao_social);
  const cpf = onlyDigits(dados.cliente_novo?.cpf_cnpj || '');
  if (name.length < 2 || name.length > 200 || !isValidCpfCnpj(cpf).ok) throw new HttpError(400, 'Informe cliente_id ou cliente_novo com nome e CPF/CNPJ válidos');
  const [result] = await conn.execute(`INSERT INTO clientes (usuario_id,nome_razao_social,cpf_cnpj,observacoes)
   VALUES (?,?,?,'Cadastrado via importação de contrato') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`, [usuarioId, name, cpf]);
  return result.insertId;
}

async function confirmar(req, res) {
  const dados = reviewed(req.body);
  const conn = await db.getConnection();
  let copied, source, committed = false;
  try {
    await conn.beginTransaction();
    const row = await owned(conn, req.params.id, req.user.id, true);
    if (row.status !== 'PENDENTE') throw new HttpError(409, 'Extração já foi confirmada ou cancelada');
    const clientId = await resolveClient(conn, req.user.id, dados);
    const payload = { ...dados, cliente_id: clientId, numero: dados.numero || `OCR-${row.id}`,
      valor_total: dados.valor_total ?? (dados.valor_parcela !== undefined ? Number(dados.valor_parcela) * Number(dados.quantidade_parcelas) : undefined),
      data_inicio: dados.data_inicio || dados.vencimentos?.[0],
      data_fim: dados.data_fim || dados.vencimentos?.at(-1) };
    const { contrato, erro } = await criarContratoComParcelas({ usuarioId: req.user.id, dados: payload, connection: conn });
    if (erro) throw erro;
    ensureUploadDirs();
    const name = crypto.randomUUID() + path.extname(row.nome_arquivo);
    source = safePath(SUBDIRS.OCR, row.nome_arquivo);
    copied = safePath(SUBDIRS.DOCS, name);
    try { await fs.copyFile(source, copied, require('fs').constants.COPYFILE_EXCL); }
    catch (err) { if (err.code === 'ENOENT') throw new HttpError(409, 'Documento original ausente; envie o arquivo novamente'); throw err; }
    const hash = crypto.createHash('sha256').update(await fs.readFile(copied)).digest('hex');
    await conn.execute(`INSERT INTO documentos (contrato_id,usuario_id,nome_original,nome_arquivo,caminho,tipo,mime,tamanho,hash,descricao)
     VALUES (?,?,?,?,?,'ORIGINAL',?,?,?,'Documento original importado por OCR')`, [contrato.id, req.user.id, row.nome_original, name, path.join(SUBDIRS.DOCS,name), row.tipo_arquivo, row.tamanho, hash]);
    await registrarHistorico(conn, { contratoId: contrato.id, usuarioId: req.user.id, acao: 'DOCUMENTO', descricao: 'Documento original importado por OCR confirmado' });
    await conn.execute("UPDATE extracao_ocr SET status='CONFIRMADA', dados_json=? WHERE id=?", [JSON.stringify(dados), row.id]);
    await conn.commit();
    committed = true;
    await fs.unlink(source).catch(() => {});
    res.status(201).json({ message: 'Contrato confirmado e criado com sucesso', contrato_id: contrato.id, numero: contrato.numero });
  } catch (err) {
    if (!committed) {
      await conn.rollback();
      if (copied) await fs.unlink(copied).catch(() => {});
    }
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Já existe um contrato com esse número');
    throw err;
  } finally { conn.release(); }
}

async function cancelarExtracao(req, res) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const row = await owned(conn, req.params.id, req.user.id, true);
    if (row.status !== 'PENDENTE') throw new HttpError(409, 'Extração já foi confirmada ou cancelada');
    await conn.execute("UPDATE extracao_ocr SET status='CANCELADA' WHERE id=?", [row.id]);
    await conn.commit();
    await fs.unlink(safePath(SUBDIRS.OCR,row.nome_arquivo)).catch(() => {});
    res.json({ message: 'Extração cancelada' });
  } catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}

module.exports = { extract, getExtracao, updateExtracao, confirmar, cancelarExtracao };
