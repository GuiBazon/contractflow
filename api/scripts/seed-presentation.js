// Dados fictícios e repetíveis para a defesa do ContractFlow.
// npm run db:demo  (somente desenvolvimento; nunca use com dados reais de produção)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const LOGIN = 'apresentacao@contractflow.com';
const PASSWORD = process.env.DEMO_PASSWORD || 'demo123';
const CLIENTS = ['Horizonte Criativo','Oficina Aurora','Escola Caminhos','Mercado Jardim','Clínica Boa Vida','Casa Nova Projetos','Integra Tecnologia','Logística Primavera','Studio Harmonia','Fábrica Horizonte','Padaria da Praça','Academia Movimento'];
// Cliente, número, valor, parcelas, vencimento inicial (dias relativos), parcelas pagas, parciais e status
const CONTRACTS = [
 [0,'APRES-001',4800,12,-150,5,0,'ATIVO'],
 [1,'APRES-002',2400,6,-90,3,0,'ATIVO'],
 [2,'APRES-003',9000,12,-210,7,1,'ATIVO'],
 [3,'APRES-004',3600,6,-120,2,0,'ATIVO'],
 [4,'APRES-005',7200,12,-30,1,0,'PENDENTE'],
 [5,'APRES-006',12500,5,-135,5,0,'ENCERRADO'],
 [6,'APRES-007',1800,6,-45,0,1,'ATIVO'],
 [7,'APRES-008',6400,8,-180,4,1,'ATIVO'],
 [8,'APRES-009',3200,4,-15,0,0,'EM_RENOVACAO'],
 [9,'APRES-010',15000,10,-270,8,0,'ATIVO'],
 [10,'APRES-011',1800,3,-80,1,0,'ATIVO'],
 [11,'APRES-012',5500,5,15,0,0,'PENDENTE']
];
const EXPENSES = [
 ['Hospedagem e infraestrutura','Tecnologia',380,-15,'PAGA'],
 ['Aluguel escritório','Administrativo',1800,-20,'PAGA'],
 ['Marketing digital','Marketing',740,-10,'PAGA'],
 ['Licenças de software','Tecnologia',250,-5,'PAGA'],
 ['Material de escritório','Administrativo',190,-35,'PAGA'],
 ['Prestador terceirizado','Serviços',920,-7,'PAGA'],
 ['Internet empresarial','Infraestrutura',180,5,'PENDENTE'],
 ['Equipamentos','Tecnologia',2200,10,'PENDENTE'],
 ['Manutenção preventiva','Serviços',520,15,'PENDENTE'],
 ['Campanha de divulgação','Marketing',1100,25,'PENDENTE'],
 ['Treinamento de equipe','RH',850,35,'PENDENTE'],
 ['Auditoria contábil','Administrativo',690,40,'PENDENTE']
];
function day(offset) {
 const today = new Date();
 const midnight = Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());
 return new Date(midnight+offset*86400000).toISOString().slice(0,10);
}
function document(index) {
 let digits = String(280000000001+index*547).padStart(12,'0');
 const groups = [[5,4,3,2,9,8,7,6,5,4,3,2],[6,5,4,3,2,9,8,7,6,5,4,3,2]];
 for(const weights of groups) {
   const sum = digits.split('').reduce((a,c,i)=>a+Number(c)*weights[i],0);
   digits += sum%11<2 ? '0' : String(11-sum%11);
 }
 return digits;
}
async function one(conn,sql,args) {
 const [rows]=await conn.execute(sql,args);
 if(!rows.length)throw new Error('Não foi possível localizar registro.');
 return rows[0].id;
}
async function main() {
 if(process.env.NODE_ENV==='production' || process.env.DEMO_SEED_DISABLED==='true')
   throw new Error('Seed de demonstração proibido em produção.');
 if(!process.env.DB_NAME)throw new Error('Configure DB_NAME no api/.env');
 const conn=await db.getConnection();
 try {
  await conn.beginTransaction();
  const hash=await bcrypt.hash(PASSWORD,10);
  await conn.execute("INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES('Apresentação ContractFlow',?,?,'ADMIN') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",[LOGIN,hash]);
  const uid=await one(conn,'SELECT id FROM usuarios WHERE email=?',[LOGIN]);
  const ids=[];
  for(let i=0;i<CLIENTS.length;i++) {
   const doc=document(i);
   await conn.execute("INSERT INTO clientes(usuario_id,nome_razao_social,cpf_cnpj,email,telefone,cidade,estado,observacoes) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",[uid,CLIENTS[i]+' Ltda',doc,'contato'+i+'@example.com','(16) 99999-0000','Franca','SP','Cliente fictício da apresentação']);
   ids.push(await one(conn,'SELECT id FROM clientes WHERE usuario_id=? AND cpf_cnpj=?',[uid,doc]));
  }
  let invoices=0, paymentCount=0;
  for(const [clientIndex,number,total,count,first,paid,partial,status] of CONTRACTS) {
    await conn.execute("INSERT INTO contratos(usuario_id,cliente_id,numero,tipo,descricao,valor_total,data_inicio,forma_pagamento,quantidade_parcelas,status,juros_percentual,multa_percentual) VALUES (?,?,?,'PRESTAÇÃO DE SERVIÇOS',?, ?,?,'PIX',?,?,1,2) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",[uid,ids[clientIndex],number,'Contrato fictício '+number,total,day(first-15),count,status]);
    const cid=await one(conn,'SELECT id FROM contratos WHERE usuario_id=? AND numero=?',[uid,number]);
    const cents=Math.round(total*100),base=Math.floor(cents/count);
    for(let n=1;n<=count;n++) {
      const value=(n===count?cents-base*(count-1):base)/100;
      await conn.execute("INSERT INTO parcelas(contrato_id,numero,valor,data_vencimento,status) VALUES (?,?,?,?,'PENDENTE') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",[cid,n,value,day(first+(n-1)*30)]);
      const pid=await one(conn,'SELECT id FROM parcelas WHERE contrato_id=? AND numero=?',[cid,n]);
      invoices++;
      const toPay=n<=paid ? value : n<=paid+partial ? Math.round(value*40)/100 : 0;
      if(toPay>0) {
        const [[{total:existing}]]=await conn.execute('SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE parcela_id=? AND estornado_em IS NULL',[pid]);
        if(Number(existing)===0)await conn.execute('INSERT INTO pagamentos(parcela_id,valor,data_pagamento,forma_pagamento,observacoes) VALUES (?,?,?,?,?)',[pid,toPay,day(Math.min(-1,first+(n-1)*30+3)),'PIX','Pagamento fictício de demonstração']);
        if(n<=paid)await conn.execute("UPDATE parcelas SET status='PAGA' WHERE id=? AND status<>'CANCELADA'",[pid]);
        paymentCount++;
      }
    }
    const [[{total:hist}]]=await conn.execute("SELECT COUNT(*) AS total FROM historico_contratos WHERE contrato_id=? AND acao='DEMO_INICIAL'",[cid]);
    if(!Number(hist))await conn.execute("INSERT INTO historico_contratos(contrato_id,usuario_id,acao,descricao) VALUES (?,?,'DEMO_INICIAL',?)",[cid,uid,'Contrato fictício criado para a apresentação final']);
  }
  for(const [name,category,value,days,status] of EXPENSES) {
    const desc='APRES | '+name;
    const [[{total:existing}]]=await conn.execute('SELECT COUNT(*) AS total FROM despesas WHERE usuario_id=? AND descricao=?',[uid,desc]);
    if(!Number(existing))await conn.execute('INSERT INTO despesas(usuario_id,descricao,categoria,valor,data,status,observacoes) VALUES (?,?,?,?,?,?,?)',[uid,desc,category,value,day(days),status,'Dado fictício da apresentação']);
  }
  await conn.commit();
  console.log(JSON.stringify({ok:true,login:LOGIN,clientes:CLIENTS.length,contratos:CONTRACTS.length,parcelas:invoices,pagamentos:paymentCount,despesas:EXPENSES.length},null,2));
  console.log('Senha local: '+(process.env.DEMO_PASSWORD?'valor de DEMO_PASSWORD':'demo123'));
  console.log('NÃO disponibilize esta conta de demonstração em produção.');
 }catch(e){await conn.rollback();throw e}
 finally{conn.release();await db.end()}
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;db.end().catch(()=>{})});
