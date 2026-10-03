import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

import { conta, entrar, password } from "./helpers";
test("cadastro, erro de login, sessão e menu para celular", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = "cadastro-" + Date.now() + "@example.test";
  await page.goto("/register");
  await page.getByLabel("Nome", { exact: true }).fill("Cadastro QA");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesse sua conta" }),
  ).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await entrar(page, email);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Clientes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesse sua conta" }),
  ).toBeVisible();
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test("cliente → contrato → pagamento parcial → documento → renovação", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await entrar(page, await conta(request));
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Clientes", exact: true })
    .click();
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Nome / Razão social", { exact: true })
    .fill("Cliente Fluxo");
  await dialog.getByLabel("CPF/CNPJ", { exact: true }).fill("123");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("inválido");
  await dialog.getByLabel("CPF/CNPJ", { exact: true }).fill("11144477735");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("link", { name: "Cliente Fluxo", exact: true }).click();
  await page.getByRole("link", { name: "Novo contrato", exact: true }).click();
  await page.getByLabel("Número do contrato", { exact: true }).fill("TST-001");
  await page.getByLabel("Valor total (R$)", { exact: true }).fill("1000");
  await page.getByLabel("Quantidade de parcelas", { exact: true }).fill("2");
  await page
    .getByLabel("Primeiro vencimento / início", { exact: true })
    .fill("2026-11-01");
  await page
    .getByRole("button", { name: "Salvar contrato", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "TST-001", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "R$ 500,00", exact: true }),
  ).toHaveCount(4);
  await page
    .getByRole("button", { name: "Pagar", exact: true })
    .first()
    .click();
  await page.getByLabel("Valor do pagamento (R$)", { exact: true }).fill("40");
  await page
    .getByRole("button", { name: "Confirmar pagamento", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "R$ 460,00", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Editar contrato", exact: true })
    .click();
  await expect(
    page.getByLabel("Valor total (R$)", { exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Descrição revisada após pagamento");
  await page
    .getByRole("button", { name: "Salvar contrato", exact: true })
    .click();
  await expect(
    page.getByText("Descrição revisada após pagamento", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pagamentos", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "R$ 40,00", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Documentos", exact: true }).click();
  await page
    .getByLabel("Documento", { exact: true })
    .setInputFiles(
      fileURLToPath(
        new URL("../../api/tests/fixtures/contrato-texto.pdf", import.meta.url),
      ),
    );
  await page
    .getByRole("button", { name: "Adicionar documento", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "contrato-texto.pdf", exact: true }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("contrato-texto.pdf");
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(page.getByText("PAGAMENTO", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Renovar", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar renovação", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "TST-001-R", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
