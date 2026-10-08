const fs = require('fs');
const path = require('path');
const { initialize, clean, close, user, auth, contract, db } = require('./helpers');
const pdf = path.join(__dirname, '../fixtures/contrato-texto.pdf');
beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('clientes têm CRUD, pesquisa, validações e proteção de vínculos', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const { body } = await api.post('/api/clientes').send({ nome_razao_social: 'Cliente Avulso', cpf_cnpj: '111.444.777-35', email: 'teste@example.com', estado: 'sp' }).expect(201);
  const id = body.cliente.id;
  await api.post('/api/clientes').send({ nome_razao_social: 'Duplicado', cpf_cnpj: '11144477735' }).expect(409);
  await api.put(`/api/clientes/${id}`).send({ nome_razao_social: '', email: 'invalido' }).expect(400);
  await api.put(`/api/clientes/${id}`).send({ nome_razao_social: 'Nome Editado', email: 'novo@example.com', estado: 'rj' }).expect(200);
  const { body: edited } = await api.get(`/api/clientes/${id}`).expect(200);
  expect(edited).toMatchObject({ nome_razao_social: 'Nome Editado', email: 'novo@example.com', estado: 'RJ', cpf_cnpj: '11144477735' });
  const { body: search } = await api.get('/api/clientes?q=Editado').expect(200);
  expect(search.data).toHaveLength(1);
  await api.get('/api/clientes?limit=1.5').expect(400);
  await api.get('/api/clientes/1abc').expect(400);
  const outro = await user('outro@example.com');
  await auth(outro.token).put(`/api/clientes/${id}`).send({ nome_razao_social: 'Ataque' }).expect(404);
  await api.delete(`/api/clientes/${id}`).expect(200);
  await api.get(`/api/clientes/${id}`).expect(404);
  const c = await contract(dono.token);
  await api.delete(`/api/clientes/${c.cliente_id}`).expect(409);
  await api.delete(`/api/contratos/${c.id}`).expect(409);
});

test('editar valor redistribui parcelas, preserva datas e protege pagamentos existentes', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const dates = ['2026-01-31','2026-03-15','2026-05-20'];
  const c = await contract(dono.token, { vencimentos: dates });
  await api.put(`/api/contratos/${c.id}`).send({ valor_total: 1200, descricao: 'Recalculado' }).expect(200);
  const { body: plan } = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  expect(plan.data.map(p=>Number(p.valor))).toEqual([400,400,400]);
  expect(plan.data.map(p=>p.data_vencimento)).toEqual(dates);
  await api.put(`/api/contratos/${c.id}`).send({ quantidade_parcelas: 2, vencimentos: ['2026-06-30','2026-07-31'] }).expect(200);
  const { body: revised } = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  expect(revised.data.map(p=>Number(p.valor))).toEqual([600,600]);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: revised.data[0].id, valor: 100, data_pagamento: '2026-06-30' }).expect(201);
  await api.put(`/api/contratos/${c.id}`).send({ valor_total: 1200, descricao: 'Texto após pagamento', quantidade_parcelas: 2 }).expect(200);
  await api.put(`/api/contratos/${c.id}`).send({ valor_total: 999 }).expect(400);
  await api.put(`/api/contratos/${c.id}`).send({ numero: 'OUTRO' }).expect(400);
  await api.put(`/api/contratos/${c.id}`).send({ quantidade_parcelas: 3 }).expect(400);
  const { body: detail } = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(detail.financeiro).toMatchObject({ valor_total: 1200, recebido: 100, pendente: 1100 });
  await api.get('/api/contratos?inicio=2026-02-30').expect(400);
  await api.get('/api/contratos?status=INVALIDO').expect(400);
  await api.get(`/api/receitas?contrato=${c.id}&limit=1`).expect(200);
  await api.get('/api/receitas?de=2026-02-30').expect(400);
  const { body: history } = await api.get(`/api/contratos/${c.id}/historico`).expect(200);
  expect(history.some(h=>h.acao==='ALTERADO')).toBe(true);
  const outro = await user('outro@example.com');
  await auth(outro.token).put(`/api/contratos/${c.id}`).send({ descricao: 'Ataque' }).expect(404);
});

test('alterar uma parcela ajusta o total e impede quitar ou cancelar sem respeitar o saldo', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 100, quantidade_parcelas: 2 });
  const { body } = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  const p = body.data[0];
  await api.patch(`/api/contratos/${c.id}/parcelas/${p.id}`).send({ status: 'PAGA' }).expect(400);
  await api.patch(`/api/contratos/${c.id}/parcelas/${p.id}`).send({ valor: 60, data_vencimento: '2026-11-30' }).expect(200);
  const { body: c2 } = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(c2.financeiro).toMatchObject({ valor_total: 110, valor_parcelas: 110, pendente: 110 });
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p.id, valor: 20, data_pagamento: '2026-10-01' }).expect(201);
  await api.patch(`/api/contratos/${c.id}/parcelas/${p.id}`).send({ valor: 70 }).expect(400);
  await api.patch(`/api/contratos/${c.id}/parcelas/${p.id}`).send({ status: 'CANCELADA' }).expect(400);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p.id, valor: 40, data_pagamento: '2026-10-02' }).expect(201);
  const { body: quit } = await api.get(`/api/contratos/${c.id}/parcelas?filtro=PAGA`).expect(200);
  expect(quit.data).toHaveLength(1);
});

test('parcelas extras concorrentes não repetem número, preservam dia-base e atualizam o contrato', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 100, quantidade_parcelas: 2 });
  const responses = await Promise.all([20,30].map(valor=>api.post(`/api/contratos/${c.id}/parcelas`).send({ quantidade_parcelas: 1,valor_parcela: valor })));
  expect(responses.map(r=>r.status)).toEqual([201,201]);
  const { body } = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  expect(body.data.map(p=>p.numero)).toEqual([1,2,3,4]);
  expect(body.data.map(p=>p.data_vencimento)).toEqual(['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
  const { body: detail } = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(Number(detail.valor_total)).toBe(150);
  expect(detail.quantidade_parcelas).toBe(4);
  expect(detail.financeiro.valor_parcelas).toBe(150);
  await api.post(`/api/contratos/${c.id}/parcelas`).send({ quantidade_parcelas: 1,valor_parcela: 20,vencimentos: '2026-06-01' }).expect(400);
  await api.post(`/api/contratos/${c.id}/parcelas`).send({ quantidade_parcelas: 120,valor_parcela: 20 }).expect(400);
  await api.patch(`/api/contratos/${c.id}/status`).send({ status: 'ENCERRADO' }).expect(200);
  await api.post(`/api/contratos/${c.id}/parcelas`).send({ quantidade_parcelas: 1,valor_parcela: 20 }).expect(400);
});

test('pagamentos e edições concorrentes usam a mesma ordem de bloqueio sem deadlock', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 100,quantidade_parcelas: 1 });
  const [[p]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=?',[c.id]);
  const requests = Array.from({ length: 3 },(_,i)=>[
    api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p.id,valor: 20,data_pagamento: '2026-01-31' }),
    api.put(`/api/contratos/${c.id}`).send({ descricao: `Descrição ${i}`,valor_total: 100 }),
  ]).flat();
  const responses = await Promise.all(requests);
  expect(responses.map(r=>r.status)).toEqual([201,200,201,200,201,200]);
  const { body } = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(body.financeiro).toMatchObject({ recebido: 60,pendente: 40 });
});

test('documentos têm pesquisa, download íntegro, vínculo correto e original protegido', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token);
  const { body } = await api.post(`/api/contratos/${c.id}/documentos`).field('tipo','ANEXO').field('descricao','Comprovante mensal').attach('arquivo',pdf).expect(201);
  const id = body.documento.id;
  const { body: list } = await api.get('/api/documentos?q=Comprovante&tipo=ANEXO').expect(200);
  expect(list.data).toHaveLength(1);
  expect(list.data[0]).toMatchObject({ id,contrato_id: c.id });
  expect(list.data[0].nome_arquivo).toBeUndefined();
  const [[row]] = await db.query('SELECT nome_arquivo FROM documentos WHERE id=?',[id]);
  const stored = path.join(process.env.UPLOAD_DIR,'docs',row.nome_arquivo);
  const downloaded = await api.get(`/api/contratos/${c.id}/documentos/${id}/arquivo`).expect(200);
  expect(downloaded.body).toEqual(fs.readFileSync(pdf));
  const { body: otherC } = await api.post('/api/contratos').send({ cliente_id: c.cliente_id,numero: 'OUTRO',valor_total: 100,quantidade_parcelas: 1,data_inicio: '2026-01-01' }).expect(201);
  await api.get(`/api/contratos/${otherC.contrato.id}/documentos/${id}/arquivo`).expect(404);
  await api.delete(`/api/contratos/${otherC.contrato.id}/documentos/${id}`).expect(404);
  const outro = await user('outro@example.com');
  const { body: isolated } = await auth(outro.token).get('/api/documentos').expect(200);
  expect(isolated.data).toEqual([]);
  await auth(outro.token).get(`/api/contratos/${c.id}/documentos/${id}/arquivo`).expect(404);
  await auth(outro.token).delete(`/api/contratos/${c.id}/documentos/${id}`).expect(404);
  await api.delete(`/api/contratos/${c.id}/documentos/${id}`).expect(200);
  expect(fs.existsSync(stored)).toBe(false);
  const { body: original } = await api.post(`/api/contratos/${c.id}/documentos`).field('tipo','ORIGINAL').attach('arquivo',pdf).expect(201);
  await api.delete(`/api/contratos/${c.id}/documentos/${original.documento.id}`).expect(400);
  await api.get(`/api/contratos/${c.id}/documentos/${original.documento.id}/arquivo`).expect(200);
});

test('uploads inválidos não deixam arquivos nem documentos e negam acesso antes de gravar', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token);
  const files = () => fs.readdirSync(path.join(process.env.UPLOAD_DIR,'docs')).sort();
  const before = files();
  await api.post(`/api/contratos/${c.id}/documentos`).attach('campo_errado',pdf).expect(400);
  await api.post(`/api/contratos/${c.id}/documentos`).field('tipo','INVALIDO').attach('arquivo',pdf).expect(400);
  await api.post(`/api/contratos/${c.id}/documentos`).attach('arquivo',Buffer.from('Texto não é PDF'),{ filename: 'falso.pdf',contentType: 'application/pdf' }).expect(400);
  await api.post(`/api/contratos/${c.id}/documentos`).attach('arquivo',fs.readFileSync(pdf),{ filename: 'errado.png',contentType: 'application/pdf' }).expect(400);
  await api.post(`/api/contratos/${c.id}/documentos`).attach('arquivo',Buffer.alloc(10*1024*1024+1),{ filename: 'grande.pdf',contentType: 'application/pdf' }).expect(413);
  const outro = await user('outro@example.com');
  await auth(outro.token).post(`/api/contratos/${c.id}/documentos`).attach('arquivo',pdf).expect(404);
  expect(files()).toEqual(before);
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM documentos WHERE contrato_id=?',[c.id]);
  expect(total).toBe(0);
});
