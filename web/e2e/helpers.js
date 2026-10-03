import { expect } from "@playwright/test";
export const apiURL = process.env.CF_E2E_API_URL || "http://127.0.0.1:8080/api";
export const password = "TesteSprint2!";
export async function conta(request) {
  const email =
    "qaweb-" +
    Date.now() +
    "-" +
    Math.random().toString(16).slice(2) +
    "@example.test";
  const response = await request.post(apiURL + "/auth/register", {
    data: { nome: "QA Web", email, senha: password },
  });
  expect(response.status()).toBe(201);
  return email;
}
export async function entrar(page, email) {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
}
