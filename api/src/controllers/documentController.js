const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const { UPLOAD_ROOT,SUBDIRS,ensureUploadDirs,buildUploader,uploadSizeHandler } = require('../config/uploads');
const { obterContratoDono,bloquearContratoDono } = require('../services/contratoService');
const { registrarHistorico } = require('../services/historicoService');
const { asyncHandler,HttpError } = require('../utils/http');
const { integer,choice,pagination,period,dateWhere } = require('../utils/query');
const { str } = require('../utils/validators');

function filePath(name) {
  const root = path.resolve(UPLOAD_ROOT,SUBDIRS.DOCS);
  const full = path.resolve(root,name);
  if (path.relative(root,full).startsWith('..') || path.isAbsolute(path.relative(root,full))) throw new HttpError(400,'Caminho de arquivo inválido');
  return full;
}

async function getDocumentoDono(documentoId,usuarioId,connection=db,contratoId,lock=false) {
  const params = [documentoId,usuarioId];
  if (contratoId !== undefined) params.push(contratoId);
  const [[row]] = await connection.execute(`SELECT d.* FROM documentos d JOIN contratos c ON c.id=d.contrato_id JOIN clientes cl ON cl.id=c.cliente_id
   WHERE d.id=? AND cl.usuario_id=?${contratoId !== undefined ? ' AND d.contrato_id=?' : ''}${lock ? ' FOR UPDATE' : ''}`,params);
  return row || null;
}

const uploadDocumento = [
  asyncHandler(async (req,res,next) => {
    const id = integer(req.params.contratoId,'Contrato');
    if (!await obterContratoDono(id,req.user.id)) throw new HttpError(404,'Contrato não encontrado');
    next();
  }),
  (req,res,next) => { ensureUploadDirs(); buildUploader(SUBDIRS.DOCS,'arquivo')(req,res,next); },
  uploadSizeHandler,
  asyncHandler(async (req,res) => {
    if (!req.file) throw new HttpError(400,'Nenhum arquivo enviado');
    let conn,committed=false;
    const filename = filePath(req.file.filename);
    try {
      const tipo = choice(req.body.tipo ?? 'ANEXO',['ORIGINAL','ANEXO'],'Tipo de documento');
      const descricao = str(req.body.descricao) || null;
      if (req.file.originalname.length > 255 || (descricao && descricao.length > 255)) throw new HttpError(400,'Nome ou descrição do documento excede 255 caracteres');
      const buffer = await fs.readFile(filename);
      const mime = req.file.mimetype;
      const valid = mime === 'application/pdf' ? buffer.subarray(0,1024).includes(Buffer.from('%PDF-'))
        : mime === 'image/png' ? buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : mime === 'image/jpeg' ? buffer[0]===255 && buffer[1]===216
        : buffer.subarray(0,4).toString()==='RIFF' && buffer.subarray(8,12).toString()==='WEBP';
      if (!valid) throw new HttpError(400,'Conteúdo incompatível com o formato informado');
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      conn = await db.getConnection(); await conn.beginTransaction();
      await bloquearContratoDono(conn, req.params.contratoId, req.user.id);
      const [result] = await conn.execute(`INSERT INTO documentos (contrato_id,usuario_id,nome_original,nome_arquivo,caminho,tipo,mime,tamanho,hash,descricao)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,[req.params.contratoId,req.user.id,req.file.originalname,req.file.filename,path.join(SUBDIRS.DOCS,req.file.filename),tipo,mime,req.file.size,hash,descricao]);
      await registrarHistorico(conn,{ contratoId: Number(req.params.contratoId),usuarioId: req.user.id,acao: 'DOCUMENTO',descricao: `${tipo} adicionado: ${req.file.originalname}` });
      await conn.commit(); committed=true;
      res.status(201).json({ message: 'Documento armazenado com sucesso',documento: { id: result.insertId,contrato_id: Number(req.params.contratoId),nome_original: req.file.originalname,tipo } });
    } catch (err) {
      if (conn && !committed) await conn.rollback();
      if (!committed) await fs.unlink(filename).catch(()=>{});
      throw err;
    } finally { if (conn) conn.release(); }
  }),
];

async function listDocumentos(req,res) {
  const id = integer(req.params.contratoId,'Contrato');
  if (!await obterContratoDono(id,req.user.id)) throw new HttpError(404,'Contrato não encontrado');
  const [rows] = await db.execute('SELECT id,nome_original,tipo,mime,tamanho,descricao,created_at,hash FROM documentos WHERE contrato_id=? ORDER BY tipo,id',[id]);
  res.json({ contrato_id: id,data: rows });
}

async function search(req,res) {
  const pages = pagination(req.query);
  const where = ['c.usuario_id=?']; const params = [req.user.id];
  const contract = integer(req.query.contrato,'Contrato',{ optional: true });
  if (contract) { where.push('c.id=?');params.push(contract); }
  if (req.query.tipo !== undefined) { where.push('d.tipo=?');params.push(choice(req.query.tipo,['ORIGINAL','ANEXO'],'Tipo')); }
  if (req.query.q !== undefined) { where.push('(d.nome_original LIKE ? OR d.descricao LIKE ?)');params.push(`%${str(req.query.q)}%`,`%${str(req.query.q)}%`); }
  const dates = period(req.query);
  dateWhere('DATE(d.created_at)',dates,where,params);
  const base = `FROM documentos d JOIN contratos c ON c.id=d.contrato_id WHERE ${where.join(' AND ')}`;
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${base}`,params);
  const [rows] = await db.query(`SELECT d.id,d.contrato_id,c.numero AS contrato_numero,d.nome_original,d.tipo,d.mime,d.tamanho,d.descricao,d.created_at ${base} ORDER BY d.id DESC LIMIT ? OFFSET ?`,[...params,pages.limit,pages.offset]);
  res.json({ data: rows,paginacao: { page: pages.page,limit: pages.limit,total,totalPages: Math.ceil(total/pages.limit) } });
}

async function downloadDocumento(req,res) {
  const row = await getDocumentoDono(integer(req.params.documentoId,'Documento'),req.user.id,db,integer(req.params.contratoId,'Contrato'));
  if (!row) throw new HttpError(404,'Documento não encontrado');
  const filename = filePath(row.nome_arquivo);
  try { await fs.access(filename); } catch { throw new HttpError(404,'Arquivo físico não encontrado'); }
  const fallback = row.nome_original.replace(/[^a-zA-Z0-9._ -]/g,'_');
  res.type(row.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition',`inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(row.nome_original)}`);
  res.sendFile(filename);
}

async function deleteDocumento(req,res) {
  let conn,source,backup,committed=false;
  try {
    conn = await db.getConnection();await conn.beginTransaction();
    await bloquearContratoDono(conn, integer(req.params.contratoId,'Contrato'), req.user.id);
    const row = await getDocumentoDono(integer(req.params.documentoId,'Documento'),req.user.id,conn,integer(req.params.contratoId,'Contrato'),true);
    if (!row) throw new HttpError(404,'Documento não encontrado');
    if (row.tipo === 'ORIGINAL') throw new HttpError(400,'Documento original não pode ser removido (RN10/RN11)');
    source = filePath(row.nome_arquivo); const staged = filePath(crypto.randomUUID()+'.removed');
    try { await fs.rename(source,staged);backup=staged; } catch(err) { if (err.code!=='ENOENT') throw err; }
    await conn.execute('DELETE FROM documentos WHERE id=?',[row.id]);
    await registrarHistorico(conn,{ contratoId: Number(req.params.contratoId),usuarioId: req.user.id,acao: 'DOCUMENTO_REMOVIDO',descricao: `Anexo removido: ${row.nome_original}` });
    await conn.commit();committed=true;
    if (backup) await fs.unlink(backup).catch(()=>{});
    res.json({ message: 'Anexo removido com sucesso' });
  } catch(err) {
    if (conn && !committed) await conn.rollback();
    if (backup && !committed) await fs.rename(backup,source);
    throw err;
  } finally { if(conn)conn.release(); }
}

module.exports = { uploadDocumento,listDocumentos: asyncHandler(listDocumentos),downloadDocumento: asyncHandler(downloadDocumento),deleteDocumento: asyncHandler(deleteDocumento),search: asyncHandler(search),getDocumentoDono };
