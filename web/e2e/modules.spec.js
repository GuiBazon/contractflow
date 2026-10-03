import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { apiURL, conta, entrar, password } from "./helpers";

test("despesa CRUD, calendário, CSV/XLSX e proteção depois de paga", async ({
  page,
  request,
}) => {
  await entrar(page, await conta(request));
  await page.goto("/financeiro?aba=despesas");
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição", { exact: true }).fill("Hospedagem QA");
  await dialog.getByLabel("Valor (R$)", { exact: true }).fill("100");
  await dialog.getByLabel("Data", { exact: true }).fill("2026-11-07");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Hospedagem QA", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Hospedagem revisada");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Hospedagem revisada", exact: true }),
  ).toBeVisible();
  await page.goto("/calendario");
  await page.getByLabel("Mês", { exact: true }).fill("2026-11");
  await page.getByRole("button", { name: /^7 —/ }).click();
  await expect(
    page.getByText("Hospedagem revisada", { exact: true }),
  ).toBeVisible();
  await page.goto("/relatorios");
  await page.getByLabel("Relatório", { exact: true }).selectOption("despesas");
  await expect(
    page.getByRole("cell", { name: "Hospedagem revisada", exact: true }),
  ).toBeVisible();
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  let file = await download;
  expect(file.suggestedFilename()).toBe("contractflow-despesas.csv");
  expect(await readFile(await file.path(), "utf8")).toContain(
    "Hospedagem revisada",
  );
  download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar XLSX", exact: true })
    .click();
  file = await download;
  expect((await readFile(await file.path())).subarray(0, 2).toString()).toBe(
    "PK",
  );
  await page.goto("/financeiro?aba=despesas");
  await page.getByRole("button", { name: "Marcar paga", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar despesa paga", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Paga", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Excluir", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Valor (R$)", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await page.goto("/home");
  await expect(
    page.locator(".kpi").filter({ hasText: "Saldo projetado" }),
  ).toContainText("-R$ 100,00");
  // Outra despesa pendente comprova exclusão sem afetar a despesa paga.
  await page.goto("/financeiro?aba=despesas");
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Excluir QA");
  await page.getByLabel("Valor (R$)", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Excluir QA" })
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Excluir QA", exact: true }),
  ).toHaveCount(0);
});

test("OCR exige conferência, salva revisão e confirma original e parcelas", async ({
  page,
  request,
}) => {
  const email = await conta(request);
  await entrar(page, email);
  const token = await page.evaluate(() => localStorage.getItem("token"));
  const headers = { Authorization: "Bearer " + token };
  await page.goto("/contratos/importar");
  await page
    .getByLabel("Arquivo do contrato", { exact: true })
    .setInputFiles(
      fileURLToPath(
        new URL("../../api/tests/fixtures/contrato-texto.pdf", import.meta.url),
      ),
    );
  await page
    .getByRole("button", { name: "Extrair dados", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Confira os dados de/ }),
  ).toBeVisible();
  await page.getByLabel("Número do contrato", { exact: true }).fill("OCR-QA");
  await page
    .getByRole("button", { name: "Confirmar importação", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Confirme que conferiu");
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByLabel("Número do contrato", { exact: true }),
  ).toHaveValue("OCR-QA");
  let response = await request.get(apiURL + "/contratos", { headers });
  expect((await response.json()).paginacao.total).toBe(0);
  await page.reload();
  await expect(
    page.getByLabel("Número do contrato", { exact: true }),
  ).toHaveValue("OCR-QA");
  await page.getByRole("checkbox", { name: /Conferi os dados/ }).check();
  await page
    .getByRole("button", { name: "Confirmar importação", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "OCR-QA", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "R$ 500,00", exact: true }),
  ).toHaveCount(4);
  await page.getByRole("button", { name: "Documentos", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Original", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Excluir", exact: true }),
  ).toHaveCount(0);
  response = await request.get(apiURL + "/contratos", { headers });
  expect((await response.json()).paginacao.total).toBe(1);
});

test("calculadora usa centavos e primeiro vencimento da API; senha revoga sessão", async ({
  page,
  request,
}) => {
  const email = await conta(request);
  await entrar(page, email);
  await page.goto("/calculadora");
  await page.getByLabel("Valor total (R$)", { exact: true }).fill("1000");
  await page.getByLabel("Quantidade de parcelas", { exact: true }).fill("6");
  await page
    .getByLabel("Primeiro vencimento", { exact: true })
    .fill("2026-11-01");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "01/11/2026", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "R$ 166,70", exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Saldo e encargos", exact: true })
    .click();
  await page.getByLabel("Principal (R$)", { exact: true }).fill("100");
  await page.getByLabel("Já pago (R$)", { exact: true }).fill("40");
  await page.getByLabel("Juros mensais (%)", { exact: true }).fill("2");
  await page.getByLabel("Multa (%)", { exact: true }).fill("2");
  await page.getByLabel("Dias de atraso", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(
    page.locator(".kpi").filter({ hasText: "Total com encargos" }),
  ).toContainText("R$ 62,40");
  const oldToken = await page.evaluate(() => localStorage.getItem("token"));
  await page.goto("/configuracoes");
  await page.getByLabel("Senha atual", { exact: true }).fill(password);
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenhaQA!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acesse sua conta" }),
  ).toBeVisible();
  expect(
    (
      await request.get(apiURL + "/auth/me", {
        headers: { Authorization: "Bearer " + oldToken },
      })
    ).status(),
  ).toBe(401);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("NovaSenhaQA!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
});

test("totais incluem mais de uma página e busca não usa somente registros já carregados", async ({
  page,
  request,
}) => {
  const email = await conta(request);
  const login = await request.post(apiURL + "/auth/login", {
    data: { email, senha: password },
  });
  const headers = { Authorization: "Bearer " + (await login.json()).token };
  const client = await request.post(apiURL + "/clientes", {
    headers,
    data: { nome_razao_social: "Cliente Paginação", cpf_cnpj: "11144477735" },
  });
  const clienteId = (await client.json()).cliente.id;
  for (let index = 1; index <= 25; index++) {
    const response = await request.post(apiURL + "/contratos", {
      headers,
      data: {
        cliente_id: clienteId,
        numero: "PAG-" + String(index).padStart(2, "0"),
        valor_total: 100,
        quantidade_parcelas: 1,
        data_inicio: "2026-11-01",
      },
    });
    expect(response.status()).toBe(201);
  }
  await entrar(page, email);
  await expect(
    page.locator(".kpi").filter({ hasText: "A receber" }),
  ).toContainText("R$ 2.500,00");
  await page.goto("/contratos");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByLabel("Pesquisar contratos", { exact: true }).fill("PAG-25");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "PAG-25", exact: true }),
  ).toBeVisible();
  await page.goto("/financeiro");
  await expect(
    page.locator(".kpi").filter({ hasText: "A receber nos filtros" }),
  ).toContainText("R$ 2.500,00");
});
