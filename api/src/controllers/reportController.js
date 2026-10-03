const reports = require('../services/reportService');
const dashboard = require('../services/dashboardService');
const recebiveis = require('../services/recebivelService');
const db = require('../config/db');
const { choice, pagination, period } = require('../utils/query');
const { HttpError } = require('../utils/http');

async function get(req, res) {
  const tipo = choice(req.params.tipo, ['FINANCEIRO','RECEBIVEIS','RECEITAS','DESPESAS','CONTRATOS'], 'Relatório');
  const formato = choice(req.query.formato ?? 'JSON', ['JSON','CSV','XLSX'], 'Formato');
  period(req.query);
  let rows, resumo, total, pages;
  if (tipo === 'FINANCEIRO') {
    resumo = await dashboard.summary(req.user.id, req.query);
    rows = [{ ...resumo, de: resumo.periodo.de, ate: resumo.periodo.ate }];
    delete rows[0].periodo;
    total = 1;
    pages = { page: 1, limit: 1 };
  } else {
    pages = pagination(req.query);
    total = await reports.count(req.user.id, tipo, req.query);
    if (tipo === 'RECEBIVEIS') resumo = await recebiveis.summary(db, req.user.id, req.query);
    if (formato !== 'JSON' && total > 10000) throw new HttpError(413, 'Exportação limitada a 10000 registros; refine os filtros');
    rows = await reports.list(req.user.id, tipo, req.query, formato === 'JSON' ? pages : { limit: 10000, offset: 0 });
  }
  if (formato === 'JSON') return res.json({ tipo, periodo: period(req.query), data: rows, ...(resumo ? { resumo } : {}), paginacao: { page: pages.page, limit: pages.limit, total, totalPages: Math.ceil(total / pages.limit) } });
  const columns = Object.keys(rows[0] || { resultado: '' });
  res.setHeader('Content-Disposition', `attachment; filename="contractflow-${tipo.toLowerCase()}.${formato.toLowerCase()}"`);
  if (formato === 'CSV') {
    res.type('text/csv; charset=utf-8');
    return res.send(reports.csv(rows, columns));
  }
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('ContractFlow');
  sheet.columns = columns.map(key => ({ header: key, key, width: 22 }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
}
module.exports = { get };
