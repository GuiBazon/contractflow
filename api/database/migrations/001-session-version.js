module.exports = async connection => {
  const [[{ total }]] = await connection.query(`SELECT COUNT(*) AS total FROM information_schema.columns
   WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name='token_version'`);
  if (!total) await connection.query('ALTER TABLE usuarios ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0');
};
