const ref = name => ({ $ref: `#/components/schemas/${name}` });
const text = (example, extra = {}) => ({ type: 'string', ...(example !== undefined ? { example } : {}), ...extra });
const number = (example = 1) => ({ type: 'number', minimum: 0, example });
const id = { type: 'integer', minimum: 1, example: 1 };
const date = { type: 'string', format: 'date', example: '2026-10-20' };
const amount = { oneOf: [{ type: 'number' }, { type: 'string', pattern: '^\\d+(\\.\\d{1,2})?$' }], example: 100 };
const object = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const array = items => ({ type: 'array', items });
const nullableFields = (properties, required = []) => Object.fromEntries(Object.entries(properties).map(([name, schema]) =>
  [name, required.includes(name) ? schema : { ...schema, nullable: true }]));
const enumText = values => ({ type: 'string', enum: values });
const contractStatuses = ['ATIVO', 'PENDENTE', 'ENCERRADO', 'CANCELADO', 'EM_RENOVACAO'];
const installmentStatuses = ['PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA'];
const dateTime = { type: 'string', format: 'date-time', nullable: true };

const clientFields = {
  nome_razao_social: text('Cliente de demonstração', { maxLength: 200 }),
  cpf_cnpj: text('11144477735'), email: text('cliente@example.com', { format: 'email' }),
  telefone: text('11999999999'), cep: text('01001000'), logradouro: text('Rua de exemplo'),
  numero: text('100'), complemento: text('Sala 1'), bairro: text('Centro'), cidade: text('São Paulo'),
  estado: text('SP', { minLength: 2, maxLength: 2 }), observacoes: text('Cliente cadastrado para demonstração'),
};
const contractFields = {
  cliente_id: id, numero: text('CONTRATO-001', { maxLength: 50 }), tipo: text('Prestação de serviço'),
  descricao: text('Descrição do contrato'), valor_total: number(1000),
  quantidade_parcelas: { type: 'integer', minimum: 1, maximum: 120, example: 3 },
  data_inicio: date, data_fim: date, vencimentos: array(date), forma_pagamento: text('PIX'),
  juros_percentual: { type: 'number', minimum: 0, maximum: 100, example: 1 },
  multa_percentual: { type: 'number', minimum: 0, maximum: 100, example: 2 },
  status: enumText(contractStatuses), observacoes: text('Observações do contrato'),
};
const schemas = {
  Message: object({ message: text('Operação concluída') }, ['message']),
  Pagination: object({ page: id, limit: id, total: { type: 'integer', minimum: 0 }, totalPages: { type: 'integer', minimum: 0 } }, ['page', 'limit', 'total', 'totalPages']),
  User: object({ id, nome: text('Usuário'), email: text('usuario@example.com', { format: 'email' }), perfil: enumText(['ADMIN', 'USUARIO']), ativo: { type: 'integer', enum: [0, 1] } }, ['id', 'nome', 'email', 'perfil']),
  Register: object({ nome: text('Usuário'), email: text('usuario@example.com', { format: 'email' }), senha: text('senha-de-exemplo', { minLength: 6, format: 'password' }) }, ['nome', 'email', 'senha']),
  Login: object({ email: text('usuario@example.com', { format: 'email' }), senha: text('senha-de-exemplo', { format: 'password' }) }, ['email', 'senha']),
  LoginResponse: object({ message: text('Login realizado com sucesso'), token: text('JWT retornado pelo login'), usuario: ref('User') }, ['token', 'usuario']),
  UserChange: object({ nome: text('Usuário'), email: text('usuario@example.com', { format: 'email' }), perfil: enumText(['ADMIN', 'USUARIO']), ativo: { type: 'integer', enum: [0, 1] } }),
  Client: object({ id, usuario_id: id, ...nullableFields(clientFields, ['nome_razao_social', 'cpf_cnpj']) }, ['id', 'nome_razao_social', 'cpf_cnpj']),
  ClientCreate: object(clientFields, ['nome_razao_social', 'cpf_cnpj']),
  ClientChange: { ...object(clientFields), minProperties: 1 },
  Contract: object({ id, usuario_id: id, ...nullableFields(contractFields, ['cliente_id', 'numero', 'valor_total']), valor_total: amount, juros_percentual: amount, multa_percentual: amount, financeiro: object({ valor_total: amount, valor_parcelas: amount, recebido: amount, pendente: amount }) }, ['id', 'cliente_id', 'numero']),
  History: array(object({ id, contrato_id: id, usuario_id: id, acao: text(), descricao: text(), created_at: dateTime })),
  ContractCreate: object(contractFields, ['cliente_id', 'numero', 'valor_total', 'quantidade_parcelas']),
  ContractChange: { ...object(Object.fromEntries(Object.entries(contractFields).filter(([name]) => !['cliente_id', 'status'].includes(name)))), minProperties: 1 },
  Installment: object({ id, numero: id, valor: amount, data_vencimento: date, status: enumText(installmentStatuses), situacao: enumText(installmentStatuses), pago: amount, dias_atraso: { type: 'integer' } }, ['id', 'numero', 'valor', 'data_vencimento']),
  SimulatedInstallment: object({ numero: id, valor: amount, data_vencimento: date, juros: amount, multa: amount, total_atualizado: amount }, ['numero', 'valor', 'data_vencimento']),
  InstallmentChange: { ...object({ valor: number(100), data_vencimento: date, status: enumText(installmentStatuses) }), minProperties: 1 },
  Payment: object({ id, parcela_id: id, valor: amount, data_pagamento: date, forma_pagamento: { ...text('PIX'), nullable: true }, observacoes: { type: 'string', nullable: true }, created_at: dateTime, status: enumText(['CONFIRMADO', 'ESTORNADO']), estornado_em: dateTime, estornado_por: { ...id, nullable: true }, motivo_estorno: { type: 'string', nullable: true } }, ['id', 'valor', 'data_pagamento']),
  PaymentCreate: object({ parcela_id: id, valor: { type: 'number', exclusiveMinimum: true, minimum: 0, example: 100 }, data_pagamento: date, forma_pagamento: text('PIX'), observacoes: text('Pagamento parcial') }, ['parcela_id', 'valor', 'data_pagamento']),
  PaymentCreated: object({ message: text('Pagamento registrado com sucesso'), pagamento: ref('Payment'), parcela: object({ id, pago: amount, valor: amount, quitada: { type: 'boolean' } }) }, ['message', 'pagamento', 'parcela']),
  Expense: object({ id, usuario_id: id, descricao: text('Aluguel'), categoria: { ...text('FIXAS'), nullable: true }, valor: amount, data: date, status: enumText(['PENDENTE', 'PAGA', 'CANCELADA']), observacoes: { type: 'string', nullable: true } }, ['id', 'descricao', 'valor', 'data', 'status']),
  ExpenseCreate: object({ descricao: text('Aluguel'), categoria: text('FIXAS'), valor: { ...number(500), exclusiveMinimum: true }, data: date, status: enumText(['PENDENTE', 'PAGA', 'CANCELADA']), observacoes: text() }, ['descricao', 'valor', 'data']),
  Document: object({ id, contrato_id: id, nome_original: text('contrato.pdf'), tipo: enumText(['ORIGINAL', 'ANEXO']), mime: text('application/pdf'), tamanho: number(1000), hash: { type: 'string', nullable: true }, descricao: { type: 'string', nullable: true }, created_at: dateTime }, ['id', 'nome_original', 'tipo']),
  Notification: object({ id: text('parcela-1'), tipo: enumText(['VENCIMENTO', 'ATRASO', 'RENOVACAO']), data: date, contrato_id: id, contrato_numero: text('CONTRATO-001'), cliente_nome: text('Cliente'), valor: amount, lida: { type: 'boolean' }, lida_em: dateTime }, ['id', 'tipo', 'data', 'lida']),
  NotificationSummary: object({ total: { type: 'integer', minimum: 0 }, nao_lidas: { type: 'integer', minimum: 0 }, lidas: { type: 'integer', minimum: 0 } }, ['total', 'nao_lidas', 'lidas']),
  Reading: object({ id: text('parcela-1'), lida: { type: 'boolean' }, lida_em: dateTime }, ['id', 'lida', 'lida_em']),
  OCRData: object({ ...contractFields, valor_parcela: number(100), cliente_novo: object({ nome_razao_social: text('Cliente'), cpf_cnpj: text('11144477735') }, ['nome_razao_social', 'cpf_cnpj']) }),
  OCRReview: object({ dados: ref('OCRData') }, ['dados']),
  OCRExtraction: object({ extracao_id: id, dados: ref('OCRData'), campos: array(text()), confianca: number(80), aviso: { type: 'string', nullable: true }, status: enumText(['PENDENTE', 'CONFIRMADA', 'CANCELADA']) }, ['extracao_id', 'dados']),
  Dashboard: object({ periodo: object({ de: { ...date, nullable: true }, ate: { ...date, nullable: true } }), clientes: number(1), contratos_ativos: number(1), recebido: amount, pendente: amount, atrasado: amount, despesas_pagas: amount, despesas_pendentes: amount, saldo_realizado: { type: 'number' }, saldo_projetado: { type: 'number' } }),
  Receivable: object({ id, numero: id, contrato_id: id, contrato_numero: text('CONTRATO-001'), cliente_id: id, cliente_nome: text('Cliente'), valor: amount, pago: amount, pendente: amount, juros: amount, multa: amount, total_atualizado: amount, data_vencimento: date, situacao: enumText(installmentStatuses), dias_atraso: number(1) }),
  CalendarEvent: object({ id: text('parcela-1'), tipo: enumText(['VENCIMENTO', 'PAGAMENTO', 'DESPESA', 'RENOVACAO']), data: date, titulo: text('Parcela 1'), valor: amount, situacao: text() }),
};

const parameter = (name, schema = text(), options = {}) => ({ name, in: 'query', schema, ...options });
const pages = [parameter('page', { type: 'integer', minimum: 1, default: 1 }), parameter('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 })];
const period = [parameter('de', date), parameter('ate', date)];
const ids = [parameter('cliente', id), parameter('contrato', id)];
const days = parameter('dias', { type: 'integer', minimum: 1, maximum: 90, default: 7 });
const paginated = schema => object({ data: array(schema), paginacao: ref('Pagination') }, ['data', 'paginacao']);
const jsonBody = schema => ({ required: true, content: { 'application/json': { schema } } });
const binary = { type: 'string', format: 'binary' };
const fileBody = { required: true, content: { 'multipart/form-data': { schema: object({ arquivo: binary, tipo: enumText(['ORIGINAL', 'ANEXO']), descricao: text() }, ['arquivo']) } } };
const paths = {};

function route(method, path, summary, tag, options = {}) {
  const pathParameters = [...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
    name, in: 'path', required: true, schema: options.pathSchemas?.[name] || id,
  }));
  const { schema = ref('Message'), status = 200, parameters = [], pathSchemas, ...extra } = options;
  const response = { description: 'Operação concluída', content: { 'application/json': { schema } } };
  const responses = Object.fromEntries([400, 401, 403, 404, 409, 413, 429, 500, 503].map(code => [code, { $ref: `#/components/responses/Error${code}` }]));
  (paths[path] ||= {})[method] = {
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    tags: [tag], summary, parameters: [...pathParameters, ...parameters],
    responses: { ...responses, [status]: response }, ...extra,
  };
}

route('get', '/health', 'Verificar se a API está em execução', 'Sistema', { security: [], schema: object({ status: text('ok'), message: text('ContractFlow API funcionando') }) });
route('post', '/auth/register', 'Cadastrar usuário', 'Autenticação', { security: [], status: 201, requestBody: jsonBody(ref('Register')), schema: object({ message: text(), usuario: ref('User') }), description: 'A primeira conta é ADMIN. Cadastro sujeito a limite por IP.' });
route('post', '/auth/login', 'Entrar e obter JWT', 'Autenticação', { security: [], requestBody: jsonBody(ref('Login')), schema: ref('LoginResponse'), description: 'Copie token da resposta e use Authorize. Cinco falhas por conta ou trinta por IP em quinze minutos retornam 429.' });
route('get', '/auth/me', 'Consultar usuário autenticado', 'Autenticação', { schema: object({ usuario: ref('User') }) });
route('post', '/auth/logout', 'Encerrar as sessões do usuário', 'Autenticação');
route('patch', '/auth/password', 'Trocar senha usando a senha atual', 'Autenticação', { requestBody: jsonBody(object({ senha_atual: text(undefined, { format: 'password' }), nova_senha: text(undefined, { format: 'password', minLength: 6 }) }, ['senha_atual', 'nova_senha'])), description: 'Revoga todas as sessões anteriores; entre novamente.' });
route('post', '/auth/forgot-password', 'Solicitar recuperação por e-mail', 'Autenticação', { security: [], requestBody: jsonBody(object({ email: text('usuario@example.com', { format: 'email' }) }, ['email'])), description: 'Resposta genérica para contas ativas, ausentes ou desativadas. SMTP e PASSWORD_RESET_URL precisam estar configurados. O token não é retornado pela API.' });
route('post', '/auth/reset-password', 'Redefinir senha com o token recebido por e-mail', 'Autenticação', { security: [], requestBody: jsonBody(object({ token: text(undefined, { minLength: 43, maxLength: 43 }), nova_senha: text(undefined, { minLength: 6, format: 'password' }) }, ['token', 'nova_senha'])), description: 'Token de uso único, válido por trinta minutos por padrão. A alteração encerra as sessões anteriores.' });

route('get', '/usuarios', 'Listar usuários (ADMIN)', 'Usuários', { parameters: [...pages, parameter('q')], schema: paginated(ref('User')) });
route('get', '/usuarios/{id}', 'Consultar usuário (ADMIN)', 'Usuários', { schema: ref('User') });
for (const method of ['put', 'patch']) route(method, '/usuarios/{id}', 'Atualizar usuário e revogar sessões (ADMIN)', 'Usuários', { requestBody: jsonBody(ref('UserChange')), schema: object({ message: text(), usuario: ref('User') }) });
route('delete', '/usuarios/{id}', 'Desativar usuário preservando seus dados (ADMIN)', 'Usuários', { description: 'Não permite desativar o último ADMIN ativo.', schema: object({ message: text(), usuario: ref('User') }) });

route('get', '/clientes', 'Pesquisar clientes do usuário', 'Clientes', { parameters: [...pages, parameter('q')], schema: paginated(ref('Client')) });
route('post', '/clientes', 'Cadastrar cliente', 'Clientes', { status: 201, requestBody: jsonBody(ref('ClientCreate')), schema: object({ message: text(), cliente: ref('Client') }) });
route('get', '/clientes/{id}', 'Consultar cliente', 'Clientes', { schema: ref('Client') });
route('put', '/clientes/{id}', 'Editar cliente', 'Clientes', { requestBody: jsonBody(ref('ClientChange')) });
route('delete', '/clientes/{id}', 'Excluir cliente sem contratos vinculados', 'Clientes');

route('get', '/contratos', 'Pesquisar e filtrar contratos', 'Contratos', { parameters: [...pages, ...period, parameter('q'), parameter('cliente', id), parameter('status', enumText(contractStatuses)), parameter('inicio', date), parameter('fim', date)], schema: paginated(ref('Contract')) });
route('post', '/contratos', 'Criar contrato com parcelas', 'Contratos', { status: 201, requestBody: jsonBody(ref('ContractCreate')), schema: object({ message: text(), contrato: ref('Contract') }), description: 'Informe data_inicio ou a lista vencimentos. Centavos e vencimentos são calculados no servidor.' });
route('get', '/contratos/{contratoId}', 'Consultar contrato e resumo financeiro', 'Contratos', { schema: ref('Contract') });
route('put', '/contratos/{contratoId}', 'Editar contrato', 'Contratos', { requestBody: jsonBody(ref('ContractChange')), description: 'Alterações financeiras são protegidas quando já existem recebimentos.' });
route('delete', '/contratos/{contratoId}', 'Excluir contrato sem registros dependentes', 'Contratos');
route('patch', '/contratos/{contratoId}/status', 'Alterar situação do contrato', 'Contratos', { requestBody: jsonBody(object({ status: enumText(contractStatuses) }, ['status'])) });
route('get', '/contratos/{contratoId}/historico', 'Consultar histórico do contrato', 'Contratos', { schema: ref('History') });
route('post', '/contratos/{contratoId}/renovar', 'Renovar contrato e registrar origem e histórico', 'Contratos', { status: 201, requestBody: jsonBody(object(contractFields, ['numero', 'data_inicio', 'valor_total', 'quantidade_parcelas'])), schema: object({ message: text(), contrato_origem_id: id, contrato: ref('Contract') }), description: 'Mantém o cliente, cria o novo contrato e encerra o anterior na mesma transação.' });

route('get', '/contratos/{contratoId}/parcelas', 'Listar parcelas e seus saldos', 'Parcelas', { parameters: [parameter('filtro', enumText(installmentStatuses))], schema: object({ contrato_id: id, data: array(ref('Installment')) }) });
route('post', '/contratos/{contratoId}/parcelas', 'Adicionar parcelas ao contrato', 'Parcelas', { status: 201, requestBody: jsonBody(object({ quantidade_parcelas: { type: 'integer', minimum: 1, maximum: 120 }, valor_parcela: number(100), vencimentos: array(date) }, ['quantidade_parcelas', 'valor_parcela'])), description: 'Atualiza o valor e a quantidade total. Contratos encerrados/cancelados não recebem novas parcelas.' });
route('patch', '/contratos/{contratoId}/parcelas/{parcelaId}', 'Alterar parcela com validações financeiras', 'Parcelas', { requestBody: jsonBody(ref('InstallmentChange')) });

route('post', '/pagamentos/{pagamentoId}/estorno', 'Estornar lançamento preservando registro e histórico', 'Pagamentos', {
  requestBody: jsonBody(object({ motivo: text('Pagamento lançado na parcela errada', { minLength: 5, maxLength: 500 }) }, ['motivo'])),
  schema: object({ message: text(), pagamento: ref('Payment'), parcela: object({ id, valor: amount, pago: amount, quitada: { type: 'boolean' } }) }),
  description: 'Somente o dono pode estornar. Registra motivo, autor e data, recalcula os saldos e reabre a parcela. Um segundo estorno retorna 409. Consultas financeiras e relatórios excluem o lançamento estornado; use status=TODOS ou ESTORNADO para auditoria.',
});
const paymentStatus = parameter('status', { type: 'string', enum: ['CONFIRMADO', 'ESTORNADO', 'TODOS'], default: 'CONFIRMADO' });
const paymentQueries = [...pages, ...period, ...ids, paymentStatus];
route('get', '/pagamentos', 'Consultar pagamentos do usuário', 'Pagamentos', { parameters: paymentQueries, schema: paginated(ref('Payment')) });
route('get', '/receitas', 'Consultar receitas de pagamentos', 'Pagamentos', { parameters: paymentQueries, schema: paginated(ref('Payment')) });
route('get', '/contratos/{contratoId}/pagamentos', 'Consultar pagamentos de um contrato', 'Pagamentos', { parameters: [...pages, ...period, paymentStatus], schema: paginated(ref('Payment')) });
route('post', '/contratos/{contratoId}/pagamentos', 'Registrar pagamento com proteção de reenvio', 'Pagamentos', {
  status: 201, requestBody: jsonBody(ref('PaymentCreate')), schema: ref('PaymentCreated'),
  parameters: [{ name: 'Idempotency-Key', in: 'header', required: false, schema: text('550e8400-e29b-41d4-a716-446655440000', { minLength: 8, maxLength: 128 }) }],
  description: 'Use uma chave aleatória por operação e repita a mesma chave nos reenvios. A resposta original é repetida sem novo pagamento; conteúdo diferente com a mesma chave retorna 409. O header opcional mantém clientes anteriores compatíveis.',
});

route('get', '/recebiveis', 'Consultar recebíveis, atrasos e encargos estimados', 'Financeiro', { parameters: [...pages, ...period, ...ids, parameter('situacao', enumText(installmentStatuses))], schema: { ...paginated(ref('Receivable')), properties: { ...paginated(ref('Receivable')).properties, resumo: object({ total: number(), recebido: amount, pendente: amount, atrasado: amount }) } } });
route('get', '/dashboard', 'Consultar indicadores e evolução financeira', 'Financeiro', { parameters: period, schema: object({ ...schemas.Dashboard.properties, fluxo_mensal: array(object({ mes: text('2026-10'), receitas: amount, despesas: amount, saldo: { type: 'number' } })), proximos_vencimentos: array(ref('Receivable')) }) });
route('get', '/calendario', 'Consultar calendário financeiro', 'Financeiro', { parameters: [...period.map(item => ({ ...item, required: true })), parameter('tipo', enumText(['VENCIMENTO', 'PAGAMENTO', 'DESPESA', 'RENOVACAO'])), parameter('page', id), parameter('limit', { type: 'integer', minimum: 1, maximum: 5000, default: 1000 })], schema: paginated(ref('CalendarEvent')), description: 'Período máximo de 366 dias; eventos paginados.' });

route('get', '/despesas', 'Consultar despesas', 'Despesas', { parameters: [...pages, ...period, parameter('status', enumText(['PENDENTE', 'PAGA', 'CANCELADA'])), parameter('categoria'), parameter('q')], schema: paginated(ref('Expense')) });
route('post', '/despesas', 'Cadastrar despesa', 'Despesas', { status: 201, requestBody: jsonBody(ref('ExpenseCreate')), schema: object({ message: text(), despesa: ref('Expense') }) });
route('get', '/despesas/{id}', 'Consultar despesa', 'Despesas', { schema: ref('Expense') });
for (const method of ['put', 'patch']) route(method, '/despesas/{id}', 'Atualizar despesa', 'Despesas', { requestBody: jsonBody({ ...schemas.ExpenseCreate, required: undefined, minProperties: 1 }), description: 'Despesas pagas protegem valor, data e situação financeira.' });
route('delete', '/despesas/{id}', 'Excluir despesa ainda não paga', 'Despesas');

route('get', '/alertas', 'Consultar alertas derivados de vencimento, atraso e renovação', 'Notificações', { parameters: [...pages, days], schema: paginated(object({ id: text('parcela-1'), tipo: enumText(['VENCIMENTO', 'ATRASO', 'RENOVACAO']), data: date, valor: amount })) });
route('get', '/notificacoes', 'Consultar notificações e estado de leitura', 'Notificações', { parameters: [...pages, days, parameter('lida', enumText(['true', 'false']))], schema: { ...paginated(ref('Notification')), properties: { ...paginated(ref('Notification')).properties, resumo: ref('NotificationSummary') } } });
route('get', '/notificacoes/resumo', 'Consultar contador de notificações', 'Notificações', { parameters: [days], schema: ref('NotificationSummary') });
route('patch', '/notificacoes/ler-todas', 'Marcar notificações atuais do período como lidas', 'Notificações', { parameters: [days], schema: ref('NotificationSummary') });
route('patch', '/notificacoes/{id}/leitura', 'Marcar notificação como lida', 'Notificações', { pathSchemas: { id: text('parcela-1') }, schema: ref('Reading') });
route('delete', '/notificacoes/{id}/leitura', 'Marcar notificação como não lida', 'Notificações', { pathSchemas: { id: text('parcela-1') }, schema: ref('Reading') });

route('get', '/documentos', 'Pesquisar documentos do usuário', 'Documentos', { parameters: [...pages, ...period, parameter('q'), parameter('contrato', id), parameter('tipo', enumText(['ORIGINAL', 'ANEXO']))], schema: paginated(ref('Document')) });
route('get', '/contratos/{contratoId}/documentos', 'Listar documentos do contrato', 'Documentos', { schema: object({ contrato_id: id, data: array(ref('Document')) }) });
route('post', '/contratos/{contratoId}/documentos', 'Enviar documento original ou anexo', 'Documentos', { status: 201, requestBody: fileBody, description: 'Campo arquivo: PDF, PNG, JPEG ou WEBP, até 10 MB. O conteúdo é validado além do MIME.', schema: object({ message: text(), documento: ref('Document') }) });
route('get', '/contratos/{contratoId}/documentos/{documentoId}/arquivo', 'Baixar documento autorizado', 'Documentos', { responses: { 200: { description: 'Arquivo original', content: Object.fromEntries(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].map(mime => [mime, { schema: binary }])) }, 401: { $ref: '#/components/responses/Error401' }, 404: { $ref: '#/components/responses/Error404' } } });
route('delete', '/contratos/{contratoId}/documentos/{documentoId}', 'Excluir anexo preservando o documento original', 'Documentos');

route('post', '/ocr/extract', 'Extrair dados sugeridos de PDF ou imagem', 'OCR', { status: 201, requestBody: fileBody, schema: ref('OCRExtraction'), description: 'Até 10 MB e 10 páginas. Suporta PDF textual, escaneado e imagem; mantém revisão humana. Processamento concorrente limitado retorna 429.' });
route('get', '/ocr/{id}', 'Consultar extração', 'OCR', { schema: ref('OCRExtraction') });
route('patch', '/ocr/{id}', 'Salvar revisão dos dados extraídos', 'OCR', { requestBody: jsonBody(ref('OCRReview')), schema: ref('OCRExtraction') });
route('post', '/ocr/{id}/confirmar', 'Confirmar revisão e criar contrato', 'OCR', { status: 201, requestBody: jsonBody(ref('OCRReview')), schema: object({ message: text(), contrato_id: id, numero: text('OCR-1') }), description: 'Cliente, contrato, parcelas, original e histórico são confirmados na mesma operação. Informe cliente_id ou cliente_novo em dados.' });
route('delete', '/ocr/{id}', 'Cancelar extração pendente', 'OCR');

const chargeFields = { dias_atraso: { type: 'integer', minimum: 0, maximum: 36500, default: 0 }, juros_percentual: number(1), multa_percentual: number(2) };
route('post', '/calculadora/parcelas', 'Simular parcelas com as regras da criação', 'Calculadora', { requestBody: jsonBody(object({ valor_total: number(1000), quantidade_parcelas: { ...id, maximum: 120 }, data_inicio: date, vencimentos: array(date), ...chargeFields }, ['valor_total', 'quantidade_parcelas'])), schema: object({ parcelas: array(ref('SimulatedInstallment')), resumo: object({ valor_total: amount, juros: amount, multa: amount, total_atualizado: amount }) }) });
route('post', '/calculadora/saldo', 'Simular saldo e encargos do principal pendente', 'Calculadora', { requestBody: jsonBody(object({ valor: number(100), valor_pago: number(20), ...chargeFields }, ['valor'])), schema: object({ valor: amount, pago: amount, pendente: amount, juros: amount, multa: amount, total_atualizado: amount }) });
route('post', '/calculadora/projecao', 'Simular saldo realizado e projetado', 'Calculadora', { requestBody: jsonBody(object({ recebido: number(1000), pendente: number(500), despesas_pagas: number(200), despesas_pendentes: number(100) })), schema: ref('Dashboard') });
route('get', '/relatorios/{tipo}', 'Consultar ou exportar relatório', 'Relatórios', {
  pathSchemas: { tipo: enumText(['financeiro', 'recebiveis', 'receitas', 'despesas', 'contratos']) },
  parameters: [...pages, ...period, ...ids, parameter('formato', enumText(['JSON', 'CSV', 'XLSX'])), parameter('status'), parameter('situacao', enumText(installmentStatuses)), parameter('categoria')],
  responses: { 200: { description: 'JSON paginado ou arquivo de todo o conjunto filtrado, até 10000 registros', content: { 'application/json': { schema: paginated({ type: 'object' }) }, 'text/csv': { schema: text() }, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: binary } } }, 400: { $ref: '#/components/responses/Error400' }, 401: { $ref: '#/components/responses/Error401' }, 413: { $ref: '#/components/responses/Error413' } },
});

// Rotas antigas continuam disponíveis para os clientes da Sprint 1.
for (const [alias, canonical] of [
  ['/parcelas/{contratoId}/parcelas', '/contratos/{contratoId}/parcelas'],
  ['/parcelas/{contratoId}/parcelas/{parcelaId}', '/contratos/{contratoId}/parcelas/{parcelaId}'],
  ['/pagamentos/{contratoId}/pagamentos', '/contratos/{contratoId}/pagamentos'],
  ['/documentos/{contratoId}/documentos', '/contratos/{contratoId}/documentos'],
  ['/documentos/{contratoId}/documentos/{documentoId}/arquivo', '/contratos/{contratoId}/documentos/{documentoId}/arquivo'],
  ['/documentos/{contratoId}/documentos/{documentoId}', '/contratos/{contratoId}/documentos/{documentoId}'],
]) {
  paths[alias] = Object.fromEntries(Object.entries(paths[canonical]).filter(([method]) => !(alias.startsWith('/parcelas/') && method === 'post')).map(([method, operation]) => [method, { ...operation, deprecated: true, operationId: `${operation.operationId}_compat`, description: `Compatibilidade. Prefira ${canonical}. ${operation.description || ''}` }]));
}

const errorDescriptions = { 400: 'Dados inválidos', 401: 'Token ausente, inválido ou revogado', 403: 'Permissão insuficiente ou conta desativada', 404: 'Recurso não encontrado para este usuário', 409: 'Conflito com o estado atual ou com a chave de idempotência', 413: 'Arquivo ou exportação acima do limite', 429: 'Muitas tentativas ou OCR ocupado', 500: 'Falha interna sem detalhes sensíveis', 503: 'Serviço temporariamente indisponível' };

module.exports = {
  openapi: '3.0.3',
  info: { title: 'ContractFlow API', version: '2.1.0', description: 'API do ContractFlow. Faça login e use Authorize com o token recebido. Dados são isolados por usuário. A documentação usa o mesmo servidor da aplicação.' },
  servers: [{ url: '/api' }],
  security: [{ bearerAuth: [] }],
  tags: ['Sistema', 'Autenticação', 'Usuários', 'Clientes', 'Contratos', 'Parcelas', 'Pagamentos', 'Financeiro', 'Despesas', 'Notificações', 'Documentos', 'OCR', 'Calculadora', 'Relatórios'].map(name => ({ name })),
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
    responses: Object.fromEntries(Object.entries(errorDescriptions).map(([code, description]) => [`Error${code}`, { description, content: { 'application/json': { schema: ref('Message') } }, ...(code === '429' ? { headers: { 'Retry-After': { description: 'Segundos até nova tentativa', schema: { type: 'integer' } } } } : {}) }])),
  },
};
