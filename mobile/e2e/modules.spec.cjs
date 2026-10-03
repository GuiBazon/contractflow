const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { apiURL, senha, conta, entrar, mais } = require("./helpers.cjs");
const fixture = path.resolve(
  __dirname,
  "../../api/tests/fixtures/contrato-texto.pdf",
);

test("OCR só cria contrato após revisão; original pode ser baixado e é protegido", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const account = await conta(request);
  const headers = { Authorization: "Bearer " + account.token };
  await entrar(page, account.email);
  await page
    .getByRole("button", { name: "Importar contrato", exact: true })
    .click();
  const upload = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Selecionar PDF", exact: true })
    .click();
  await (await upload).setFiles(fixture);
  await page
    .getByRole("button", { name: "Revisar dados", exact: true })
    .click();
  await page.getByLabel("Número do contrato", { exact: true }).fill("OCR-MOB");
  await page
    .getByLabel("Início (AAAA-MM-DD)", { exact: true })
    .fill("2026-11-01");
  await page
    .getByRole("button", { name: "Confirmar importação", exact: true })
    .click();
  await expect(
    page.getByText("Confirme que revisou os dados antes de importar.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByText("Revisão salva. Nenhum contrato foi criado.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (await (await request.get(apiURL + "/contratos", { headers })).json())
      .paginacao.total,
  ).toBe(0);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page
    .getByRole("button", { name: "Revisar dados", exact: true })
    .click();
  await expect(
    page.getByLabel("Número do contrato", { exact: true }),
  ).toHaveValue("OCR-MOB");
  await page
    .getByRole("checkbox", {
      name: "Revisei os dados da importação",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Confirmar importação", exact: true })
    .click();
  await expect(page.getByText("OCR-MOB", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Documentos", exact: true }).click();
  await expect(page.getByText(/ORIGINAL ·/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Excluir contrato-texto.pdf",
      exact: true,
    }),
  ).toHaveCount(0);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar contrato-texto.pdf", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("contrato-texto.pdf");
  expect(
    (await (await request.get(apiURL + "/contratos", { headers })).json())
      .paginacao.total,
  ).toBe(1);
  expect(errors).toEqual([]);
});

test("despesa CRUD, calendário, CSV/XLSX e proteção após pagamento", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await entrar(page, (await conta(request)).email);
  await page.getByRole("tab", { name: "Financeiro", exact: true }).click();
  await page.getByRole("button", { name: "Despesas", exact: true }).click();
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Hospedagem Mobile");
  await page.getByLabel("Valor (R$)", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Salvar despesa", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ hasText: "Hospedagem Mobile" })
    .click();
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Hospedagem Mobile revisada");
  await page
    .getByRole("button", { name: "Salvar despesa", exact: true })
    .click();
  await page.getByRole("tab", { name: "Agenda", exact: true }).click();
  await expect(
    page.getByRole("button").filter({ hasText: "Hospedagem Mobile revisada" }),
  ).toBeVisible();
  await mais(page, "Relatórios");
  await page.getByRole("button", { name: "Despesas", exact: true }).click();
  let downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  let file = await downloaded;
  expect(file.suggestedFilename()).toBe("contractflow-despesas.csv");
  expect(await readFile(await file.path(), "utf8")).toContain(
    "Hospedagem Mobile revisada",
  );
  downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar XLSX", exact: true })
    .click();
  file = await downloaded;
  expect((await readFile(await file.path())).subarray(0, 2).toString()).toBe(
    "PK",
  );
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("tab", { name: "Financeiro", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Hospedagem Mobile revisada" })
    .click();
  await page.getByRole("button", { name: "PAGA", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar despesa", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ hasText: "Hospedagem Mobile revisada" })
    .click();
  await expect(
    page.getByLabel("Valor (R$)", { exact: true }),
  ).not.toBeEditable();
  await expect(
    page.getByRole("button", { name: "Excluir despesa", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Despesa a remover");
  await page.getByLabel("Valor (R$)", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Salvar despesa", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ hasText: "Despesa a remover" })
    .click();
  await page
    .getByRole("button", { name: "Excluir despesa", exact: true })
    .click();
  await expect(
    page.getByText("Despesa a remover", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("calculadora usa centavos e dia 1; troca de senha encerra sessões", async ({
  page,
  request,
}) => {
  const account = await conta(request);
  await entrar(page, account.email);
  await mais(page, "Calculadora financeira");
  await page.getByLabel("Valor total (R$)", { exact: true }).fill("1000");
  await page.getByLabel("Quantidade de parcelas", { exact: true }).fill("6");
  await page
    .getByLabel("Primeiro vencimento (AAAA-MM-DD)", { exact: true })
    .fill("2026-11-01");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(
    page.getByText("Parcela 6 · R$ 166,70", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Vence 01/11/2026", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByLabel("Senha atual", { exact: true }).fill(senha);
  await page.getByLabel("Nova senha", { exact: true }).fill("SenhaMobileNova!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("SenhaMobileNova!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(
    page.getByText("Entrar na sua conta", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.get(apiURL + "/auth/me", {
        headers: { Authorization: "Bearer " + account.token },
      })
    ).status(),
  ).toBe(401);
  await entrar(page, account.email, "SenhaMobileNova!");
});

test("totais incluem 25 contratos; busca pagina e nova tentativa recupera falha", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const account = await conta(request);
  const headers = { Authorization: "Bearer " + account.token };
  let response = await request.post(apiURL + "/clientes", {
    headers,
    data: {
      nome_razao_social: "Cliente de paginação mobile",
      cpf_cnpj: "52998224725",
    },
  });
  expect(response.status()).toBe(201);
  const cliente = (await response.json()).cliente.id;
  for (let index = 1; index <= 25; index++) {
    response = await request.post(apiURL + "/contratos", {
      headers,
      data: {
        cliente_id: cliente,
        numero: "PAG-" + String(index).padStart(2, "0"),
        valor_total: 100,
        quantidade_parcelas: 1,
        data_inicio: "2026-01-01",
      },
    });
    expect(response.status()).toBe(201);
  }
  await entrar(page, account.email);
  await expect(
    page.getByText("R$ 2.500,00", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Contratos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Abrir contrato PAG-/ }),
  ).toHaveCount(20);
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Abrir contrato PAG-/ }),
  ).toHaveCount(5);
  await page.getByLabel("Buscar contratos", { exact: true }).fill("PAG-25");
  await expect(
    page.getByRole("button", { name: /^Abrir contrato PAG-/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Abrir contrato PAG-25", exact: true }),
  ).toBeVisible();
  await page.route("**/api/clientes?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Clientes indisponíveis para QA" }),
    }),
  );
  await page.getByRole("tab", { name: "Clientes", exact: true }).click();
  await expect(
    page.getByText("Clientes indisponíveis para QA", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/clientes?**");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Abrir cliente Cliente de paginação mobile",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
