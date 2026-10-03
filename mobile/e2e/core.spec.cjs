const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { apiURL, senha, conta, entrar, mais } = require("./helpers.cjs");
const fixture = path.resolve(
  __dirname,
  "../../api/tests/fixtures/contrato-texto.pdf",
);
// Cada teste usa uma conta sintética própria e um banco de QA separado.
test("cadastro, sessão restaurada, erro de login e logout com revogação", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = "qamobile-ui-" + Date.now() + "@example.test";
  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("QA Mobile");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByLabel("Confirmar senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByText("Resumo do negócio", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Resumo do negócio", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  const login = await request.post(apiURL + "/auth/login", {
    data: { email, senha },
  });
  const token = (await login.json()).token;
  await mais(page, "Sair da conta");
  await expect(
    page.getByText("Entrar na sua conta", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.get(apiURL + "/auth/me", {
        headers: { Authorization: "Bearer " + token },
      })
    ).status(),
  ).toBe(401);
  await page.getByLabel("Campo de e-mail", { exact: true }).fill(email);
  await page.getByLabel("Campo de senha", { exact: true }).fill("SenhaErrada!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByText("Credenciais inválidas", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Campo de senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByText("Resumo do negócio", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("cliente, contrato, pagamento parcial, edição protegida, anexos, parcelas extras e renovação", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await entrar(page, (await conta(request)).email);
  await page.getByRole("tab", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page
    .getByLabel("Nome / Razão social", { exact: true })
    .fill("Cliente Mobile");
  await page.getByLabel("CPF/CNPJ", { exact: true }).fill("11111111111");
  await page
    .getByRole("button", { name: "Cadastrar cliente", exact: true })
    .click();
  await expect(
    page.getByText("CPF/CNPJ inválido", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("CPF/CNPJ", { exact: true }).fill("52998224725");
  await page
    .getByRole("button", { name: "Cadastrar cliente", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Novo contrato para este cliente",
      exact: true,
    })
    .click();
  await page.getByLabel("Número do contrato", { exact: true }).fill("MOB-QA");
  await page.getByLabel("Valor total (R$)", { exact: true }).fill("1.000,00");
  await page.getByLabel("Quantidade de parcelas", { exact: true }).fill("2");
  await page
    .getByLabel("Início (AAAA-MM-DD)", { exact: true })
    .fill("2026-11-01");
  await page
    .getByRole("button", { name: "Criar contrato", exact: true })
    .click();
  await expect(page.getByText("MOB-QA", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  await expect(page.getByLabel("Valor pago (R$)", { exact: true })).toHaveValue(
    "500",
  );
  await page.getByLabel("Valor pago (R$)", { exact: true }).fill("40");
  await page
    .getByRole("button", { name: "Confirmar pagamento", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voltar ao contrato", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  await expect(page.getByLabel("Valor pago (R$)", { exact: true })).toHaveValue(
    "460",
  );
  await page.getByLabel("Valor pago (R$)", { exact: true }).fill("461");
  await page
    .getByRole("button", { name: "Confirmar pagamento", exact: true })
    .click();
  await expect(
    page.getByText(
      "Informe um valor positivo até o saldo pendente da parcela.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar contrato", exact: true })
    .click();
  await expect(
    page.getByLabel("Valor total (R$)", { exact: true }),
  ).not.toBeEditable();
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Contrato revisado no mobile");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(
    page.getByText("Contrato revisado no mobile", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar parcelas extras", exact: true })
    .click();
  await page
    .getByLabel("Quantidade de parcelas extras", { exact: true })
    .fill("2");
  await page
    .getByLabel("Valor de cada parcela (R$)", { exact: true })
    .fill("10");
  await page
    .getByRole("button", { name: "Confirmar parcelas extras", exact: true })
    .click();
  await expect(
    page.getByText("Parcela 4 · R$ 10,00", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Documentos", exact: true }).click();
  const upload = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Adicionar anexo", exact: true })
    .click();
  await (await upload).setFiles(fixture);
  await expect(
    page.getByText("contrato-texto.pdf", { exact: true }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar contrato-texto.pdf", exact: true })
    .click();
  const arquivo = await downloaded;
  expect(arquivo.suggestedFilename()).toBe("contrato-texto.pdf");
  expect((await readFile(await arquivo.path())).subarray(0, 4).toString()).toBe(
    "%PDF",
  );
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(page.getByText("PAGAMENTO", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Renovar contrato", exact: true })
    .click();
  await page.getByLabel("Número do contrato", { exact: true }).fill("MOB-QA-R");
  await page
    .getByLabel("Início (AAAA-MM-DD)", { exact: true })
    .fill("2027-03-01");
  await page
    .getByRole("button", { name: "Confirmar renovação", exact: true })
    .click();
  await expect(page.getByText("MOB-QA-R", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
