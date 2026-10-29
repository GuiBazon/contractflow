import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Calendar from "./calendar";
import { dataLocal } from "../../utils/calendar";

const getContratos = vi.fn();
const getParcelas = vi.fn();

vi.mock("../../axios/axios", () => ({
  default: {
    getContratos: (...args) => getContratos(...args),
    getParcelas: (...args) => getParcelas(...args),
  },
}));

const hoje = dataLocal(new Date());

function renderizar() {
  return render(
    <MemoryRouter>
      <Calendar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  getContratos.mockReset();
  getParcelas.mockReset();
  getContratos.mockResolvedValue({
    data: { data: [{ id: 7, numero: "CT-007", cliente_nome: "Empresa Alfa" }] },
  });
  getParcelas.mockResolvedValue({
    data: {
      data: [
        {
          id: 1,
          numero: 1,
          valor: 1500,
          data_vencimento: hoje,
          situacao: "PENDENTE",
        },
      ],
    },
  });
});

describe("Calendar", () => {
  it("exibe os vencimentos dos contratos na agenda do dia", async () => {
    renderizar();

    expect(await screen.findByText("Parcela 1 · CT-007")).toBeInTheDocument();
    expect(screen.getByText(/Empresa Alfa/)).toBeInTheDocument();
    expect(getParcelas).toHaveBeenCalledWith(7);
  });

  it("não salva o compromisso ao clicar em Cancelar", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole("button", { name: "Novo compromisso" }));
    await usuario.type(screen.getByLabelText(/Título/), "Compromisso cancelado");
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText(/Título/)).not.toBeInTheDocument();
    expect(localStorage.getItem("calendar_eventos")).toBe("[]");
    expect(screen.queryByText("Compromisso cancelado")).not.toBeInTheDocument();
  });

  it("salva o compromisso local ao enviar o formulário", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole("button", { name: "Novo compromisso" }));
    await usuario.type(screen.getByLabelText(/Título/), "Reunião de equipe");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.getByText("Reunião de equipe")).toBeInTheDocument();
    });
    expect(localStorage.getItem("calendar_eventos")).toContain("Reunião de equipe");
  });
});
