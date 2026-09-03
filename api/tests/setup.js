// Config de ambiente para os testes (nao toca no .env real de producao).
process.env.JWT_SECRET = 'segredo-de-teste-bem-longo-e-seguro-para-jest';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'teste';
process.env.DB_PASSWORD = 'teste';
process.env.DB_NAME = 'contractflow_test';
process.env.CORS_ORIGINS = '';
process.env.TZ = 'UTC';
