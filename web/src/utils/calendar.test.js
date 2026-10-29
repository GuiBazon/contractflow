import { describe, expect, it } from "vitest";
import {
  CATEGORIAS,
  CORES_SITUACAO,
  agruparPorData,
  combinarContratosComParcelas,
  corEvento,
  criarGradeMes,
  dataLocal,
  dataValida,
  extrairVencimentos,
  filtrarEventos,
  lerEventosPessoais,
  mesclarEventos,
  normalizarData,
  normalizarEventoPessoal,
  resumoVencimentos,
} from "./calendar";

describe("dataLocal", () => {
  it("formata a data local com zero à esquerda", () => {
    expect(dataLocal(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dataLocal(new Date(2026, 9, 29))).toBe("2026-10-29");
  });
});

describe("dataValida", () => {
  it.each(["2026-01-05", "2024-02-29", "2026-12-31"])(
    "aceita a data real %s",
    (valor) => {
      expect(dataValida(valor)).toBe(true);
    }
  );

  it.each(["2026-02-31", "2026-13-01", "2026-00-10", "2026-1-5", "05/01/2026", "", null, undefined])(
    "rejeita o valor inválido %s",
    (valor) => {
      expect(dataValida(valor)).toBe(false);
    }
  );
});

describe("normalizarData", () => {
  it("mantém apenas a parte da data de um ISO completo", () => {
    expect(normalizarData("2026-10-05T00:00:00.000Z")).toBe("2026-10-05");
  });

  it("retorna null para valor inválido", () => {
    expect(normalizarData("data-invalida")).toBeNull();
    expect(normalizarData(undefined)).toBeNull();
  });
});

describe("criarGradeMes", () => {
  it("começa no domingo, termina no sábado e completa semanas", () => {
    const grade = criarGradeMes(2026, 9); // outubro/2026
    const primeiro = new Date(`${grade[0].data}T12:00:00`);
    const ultimo = new Date(`${grade[grade.length - 1].data}T12:00:00`);

    expect(primeiro.getDay()).toBe(0);
    expect(ultimo.getDay()).toBe(6);
    expect(grade.length % 7).toBe(0);
  });

  it("inclui todos os dias do mês corrente", () => {
    const grade = criarGradeMes(2026, 9); // outubro/2026
    const doMes = grade.filter((celula) => celula.noMes);

    expect(doMes).toHaveLength(31);
    expect(doMes[0].dia).toBe(1);
    expect(doMes[30].dia).toBe(31);
  });

  it("inclui dias do mês anterior para alinhar a primeira semana", () => {
    const grade = criarGradeMes(2026, 9); // outubro/2026 começa numa quinta-feira
    expect(grade[0]).toMatchObject({ data: "2026-09-27", noMes: false });
  });
});

describe("lerEventosPessoais", () => {
  it("retorna lista vazia para JSON inválido", () => {
    expect(lerEventosPessoais("{oops")).toEqual([]);
    expect(lerEventosPessoais(null)).toEqual([]);
  });

  it("descarta registros inválidos e normaliza os válidos", () => {
    const json = JSON.stringify([
      { id: "1", titulo: "Reunião", data: "2026-10-05", categoria: "Trabalho", horario: "09:00" },
      { id: "2", titulo: "Sem data", data: "05/10/2026" },
      { id: "3", titulo: "   ", data: "2026-10-06" },
    ]);

    const eventos = lerEventosPessoais(json);

    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      id: "1",
      tipo: "compromisso",
      titulo: "Reunião",
      categoria: "Trabalho",
      horario: "09:00",
    });
  });
});

describe("normalizarEventoPessoal", () => {
  it("usa Outros quando a categoria não existe", () => {
    const evento = normalizarEventoPessoal({
      id: "1",
      titulo: "  Consulta  ",
      data: "2026-10-05",
      categoria: "Inexistente",
    });

    expect(evento.titulo).toBe("Consulta");
    expect(evento.categoria).toBe("Outros");
    expect(evento.tipo).toBe("compromisso");
  });
});

describe("extrairVencimentos", () => {
  const contratos = [
    {
      id: 7,
      numero: "CT-007",
      cliente_nome: "Empresa Alfa",
      parcelas: [
        { id: 1, numero: 1, valor: "1500.50", data_vencimento: "2026-10-05T00:00:00.000Z", situacao: "PENDENTE" },
        { id: 2, numero: 2, valor: 1500.5, data_vencimento: "2026-10-05", situacao: "PAGA" },
        { id: 3, numero: 3, valor: 10, data_vencimento: "data-invalida", situacao: "PENDENTE" },
      ],
    },
  ];

  it("converte parcelas em eventos de vencimento", () => {
    const eventos = extrairVencimentos(contratos);

    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toMatchObject({
      tipo: "vencimento",
      data: "2026-10-05",
      contratoId: 7,
      valor: 1500.5,
      situacao: "PENDENTE",
    });
    expect(eventos[0].titulo).toContain("CT-007");
    expect(eventos[0].descricao).toContain("Empresa Alfa");
  });

  it("usa PENDENTE quando a situação vem desconhecida", () => {
    const [evento] = extrairVencimentos([
      { id: 1, parcelas: [{ id: 1, valor: 10, data_vencimento: "2026-10-05", situacao: "???" }] },
    ]);

    expect(evento.situacao).toBe("PENDENTE");
  });

  it("tolera contratos sem parcelas", () => {
    expect(extrairVencimentos([{ id: 1 }])).toEqual([]);
    expect(extrairVencimentos()).toEqual([]);
  });
});

describe("combinarContratosComParcelas", () => {
  it("anexa parcelas resolvidas e deixa vazio o contrato que falhou", () => {
    const contratos = [{ id: 1 }, { id: 2 }];
    const respostas = [
      { status: "fulfilled", value: { data: { data: [{ id: 10 }] } } },
      { status: "rejected", reason: new Error("falhou") },
    ];

    const combinados = combinarContratosComParcelas(contratos, respostas);

    expect(combinados[0].parcelas).toEqual([{ id: 10 }]);
    expect(combinados[1].parcelas).toEqual([]);
  });
});

describe("agruparPorData", () => {
  it("agrupa os eventos pela data", () => {
    const mapa = agruparPorData([
      { id: "a", data: "2026-10-05" },
      { id: "b", data: "2026-10-05" },
      { id: "c", data: "2026-10-06" },
    ]);

    expect(mapa.get("2026-10-05")).toHaveLength(2);
    expect(mapa.get("2026-10-06")).toHaveLength(1);
    expect(mapa.get("2026-10-07")).toBeUndefined();
  });
});

describe("filtrarEventos", () => {
  const eventos = [
    { id: "a", tipo: "compromisso", titulo: "Reunião", categoria: "Trabalho", horario: "14:00", data: "2026-10-05" },
    { id: "b", tipo: "compromisso", titulo: "Consulta", categoria: "Saúde", horario: "08:00", data: "2026-10-05" },
    {
      id: "c",
      tipo: "vencimento",
      titulo: "Parcela 1 · CT-007",
      categoria: "Vencimentos",
      horario: "",
      data: "2026-10-05",
      cliente: "Empresa Alfa",
      contrato: "CT-007",
    },
  ];

  it("ordena por horário", () => {
    expect(filtrarEventos(eventos).map((evento) => evento.id)).toEqual(["c", "b", "a"]);
  });

  it("filtra vencimentos e compromissos", () => {
    expect(filtrarEventos(eventos, { filtro: "Vencimentos" }).map((e) => e.id)).toEqual(["c"]);
    expect(filtrarEventos(eventos, { filtro: "Compromissos" }).map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("filtra por categoria", () => {
    expect(filtrarEventos(eventos, { filtro: "Trabalho" }).map((e) => e.id)).toEqual(["a"]);
  });

  it("pesquisa por título sem diferenciar maiúsculas e por cliente", () => {
    expect(filtrarEventos(eventos, { pesquisa: "reunião" }).map((e) => e.id)).toEqual(["a"]);
    expect(filtrarEventos(eventos, { pesquisa: "alfa" }).map((e) => e.id)).toEqual(["c"]);
  });

  it("retorna vazio quando nada corresponde", () => {
    expect(filtrarEventos(eventos, { pesquisa: "inexistente" })).toEqual([]);
  });
});

describe("resumoVencimentos", () => {
  it("soma os valores por situação, ignorando compromissos", () => {
    const resumo = resumoVencimentos([
      { tipo: "vencimento", situacao: "PAGA", valor: 100 },
      { tipo: "vencimento", situacao: "PENDENTE", valor: 50 },
      { tipo: "vencimento", situacao: "VENCIDA", valor: 25 },
      { tipo: "vencimento", situacao: "CANCELADA", valor: 10 },
      { tipo: "compromisso", situacao: "PAGA", valor: 999 },
    ]);

    expect(resumo).toEqual({ pago: 100, pendente: 50, vencido: 25, cancelado: 10 });
  });

  it("zera os totais sem eventos", () => {
    expect(resumoVencimentos()).toEqual({ pago: 0, pendente: 0, vencido: 0, cancelado: 0 });
  });
});

describe("corEvento", () => {
  it("usa a cor da situação para vencimentos", () => {
    expect(corEvento({ tipo: "vencimento", situacao: "VENCIDA" })).toBe(CORES_SITUACAO.VENCIDA);
  });

  it("usa a cor da categoria para compromissos", () => {
    expect(corEvento({ tipo: "compromisso", categoria: "Trabalho" })).toBe(CATEGORIAS.Trabalho);
  });

  it("usa Outros quando a categoria é desconhecida", () => {
    expect(corEvento({ tipo: "compromisso", categoria: "?" })).toBe(CATEGORIAS.Outros);
  });
});

describe("mesclarEventos", () => {
  const pessoais = [{ id: "a", tipo: "compromisso" }];
  const vencimentos = [{ id: "b", tipo: "vencimento" }];

  it("inclui vencimentos quando habilitado", () => {
    expect(mesclarEventos(pessoais, vencimentos)).toHaveLength(2);
  });

  it("oculta vencimentos quando desabilitado", () => {
    expect(mesclarEventos(pessoais, vencimentos, { mostrarVencimentos: false })).toEqual(pessoais);
  });
});
