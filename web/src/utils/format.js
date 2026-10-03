const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const dinheiro = (value) => currency.format(Number(value || 0));
export const dataBr = (value) =>
  value ? String(value).slice(0, 10).split("-").reverse().join("/") : "—";
export function hoje() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export const labels = {
  ATIVO: "Ativo",
  PENDENTE: "Pendente",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
  EM_RENOVACAO: "Em renovação",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  ORIGINAL: "Original",
  ANEXO: "Anexo",
  ATRASO: "Atraso",
  VENCIMENTO: "Vencimento",
  PAGAMENTO: "Pagamento",
  DESPESA: "Despesa",
  RENOVACAO: "Renovação",
  ADMIN: "Administrador",
  USUARIO: "Usuário",
};
