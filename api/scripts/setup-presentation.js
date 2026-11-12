// Prepara banco LOCAL com segurança: cria o que faltar, migra, popula e verifica.
// Não apaga tabelas nem dados existentes.
require('dotenv').config();
const fs=require('fs');
const path=require('path');
const mysql=require('mysql2/promise');
const { spawnSync }=require('child_process');
async function run(){
 const host=String(process.env.DB_HOST||'').toLowerCase();
 if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(host))
   throw new Error('Preparação de demo permitida apenas para MySQL LOCAL (DB_HOST=localhost/127.0.0.1).');
 if(process.env.DB_NAME!=='contractflow')throw new Error('Use DB_NAME=contractflow para evitar alterar outro banco.');
 if(!process.env.DB_USER || !process.env.DB_PASSWORD)
   throw new Error('Preencha DB_USER e DB_PASSWORD em api/.env');
 let c;
 try{
  c=await mysql.createConnection({host,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true});
  await c.query(fs.readFileSync(path.join(__dirname,'../database/schema.sql'),'utf8'));
  console.log('1/3: Estrutura MySQL verificada sem excluir registros.');
 } finally {if(c)await c.end()}
 const db=require('../src/config/db');
 try{
  const conn=await db.getConnection();
  try{await require('./migrate').migrate(conn);console.log('2/3: Migrações aplicadas.')}
  finally{conn.release()}
 }finally{await db.end()}
 const s=spawnSync(process.execPath,['scripts/seed-presentation.js'],{cwd:path.join(__dirname,'..'),stdio:'inherit',env:process.env});
 if(s.error)throw s.error;
 if(s.status!==0)throw new Error('Seed de apresentação falhou (código '+s.status+').');
 console.log('3/3: Dados de apresentação prontos. Faça login com apresentacao@contractflow.com');
}
run().catch(err=>{console.error('PREPARAÇÃO FALHOU:',err.code||err.message);process.exitCode=1});
