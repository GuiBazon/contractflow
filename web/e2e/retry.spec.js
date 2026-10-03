import { test, expect } from "@playwright/test";
import { conta, entrar } from "./helpers";

test("falha temporária mostra erro e permite repetir a consulta sem perder sessão", async ({
  page,
  request,
}) => {
  await entrar(page, await conta(request));
  const target = /\/api\/clientes(?:\?.*)?$/;
  await page.route(target, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Serviço temporariamente indisponível.",
      }),
    }),
  );
  await page.goto("/clientes");
  await expect(page.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
  await page.unroute(target);
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByText("Nenhum registro encontrado.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => Boolean(localStorage.getItem("token"))),
  ).toBe(true);
});
