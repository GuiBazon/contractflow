module.exports = async connection => {
  for (const [name, type] of [
    ['cargo', 'VARCHAR(150) NULL'],
    ['telefone', 'VARCHAR(30) NULL'],
    ['razao_social', 'VARCHAR(150) NULL'],
    ['cnpj', 'VARCHAR(14) NULL'],
    ['inscricao_estadual', 'VARCHAR(30) NULL'],
    ['foto_arquivo', 'VARCHAR(80) NULL'],
    ['foto_mime', 'VARCHAR(20) NULL'],
  ]) {
    const [[{ total }]] = await connection.execute(`SELECT COUNT(*) AS total FROM information_schema.columns
      WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name=?`, [name]);
    if (!total) await connection.query(`ALTER TABLE usuarios ADD COLUMN ${name} ${type}`);
  }
};
