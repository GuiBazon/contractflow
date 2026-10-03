const { expect } = require("@playwright/test");
const apiURL = process.env.CF_E2E_API_URL || "http://127.0.0.1:8080/api";
const senha = "TesteSprint2!";
async function conta(request) {
  const email =
    "qamobile-" +
    Date.now() +
    "-" +
    Math.random().toString(16).slice(2) +
    "@example.test";
  const response = await request.post(apiURL + "/auth/register", {
    data: { nome: "QA Mobile", email, senha },
  });
  expect(response.status()).toBe(201);
  const login = await request.post(apiURL + "/auth/login", {
    data: { email, senha },
  });
  expect(login.status()).toBe(200);
  return { email, token: (await login.json()).token };
}
async function entrar(page, email, password = senha) {
  await page.goto("/");
  await page.getByLabel("Campo de e-mail", { exact: true }).fill(email);
  await page.getByLabel("Campo de senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByText("Resumo do negócio", { exact: true }),
  ).toBeVisible();
}
async function mais(page, item) {
  await page.getByRole("button", { name: "Mais opções", exact: true }).click();
  await page.getByRole("button", { name: item, exact: true }).click();
}
module.exports = { apiURL, senha, conta, entrar, mais };
