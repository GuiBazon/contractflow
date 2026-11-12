module.exports = async connection => {
  for (const [name, type] of [
    ['estornado_em', 'DATETIME NULL'],
    ['estornado_por', 'INT NULL'],
    ['motivo_estorno', 'VARCHAR(500) NULL'],
  ]) {
    const [[row]] = await connection.execute(`SELECT COUNT(*) AS total FROM information_schema.columns
      WHERE table_schema=DATABASE() AND table_name='pagamentos' AND column_name=?`, [name]);
    if (!row.total) await connection.query(`ALTER TABLE pagamentos ADD COLUMN ${name} ${type}`);
  }
  const constraints = [
    ['fk_pagamento_estornado_por', 'FOREIGN KEY (estornado_por) REFERENCES usuarios(id) ON DELETE RESTRICT'],
    ['chk_pagamento_estorno', `CHECK (
      (estornado_em IS NULL AND estornado_por IS NULL AND motivo_estorno IS NULL) OR
      (estornado_em IS NOT NULL AND estornado_por IS NOT NULL AND motivo_estorno IS NOT NULL AND CHAR_LENGTH(TRIM(motivo_estorno))>=5)
    )`],
  ];
  for (const [name, definition] of constraints) {
    const [[row]] = await connection.execute(`SELECT COUNT(*) AS total FROM information_schema.table_constraints
      WHERE constraint_schema=DATABASE() AND table_name='pagamentos' AND constraint_name=?`, [name]);
    if (!row.total) await connection.query(`ALTER TABLE pagamentos ADD CONSTRAINT ${name} ${definition}`);
  }
};
