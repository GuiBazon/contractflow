import { useCallback, useEffect, useState } from "react";
import { api, mensagemErro } from "../axios/axios";

// Cancela a consulta antiga quando o usuário troca de filtro ou de tela.
// allPages é usado no calendário, que precisa dos eventos do mês inteiro.
export default function useConsulta(path, params = {}, allPages = false) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== "" && value != null),
  ).toString();
  const [result, setResult] = useState({
    data: null,
    loading: true,
    error: "",
  });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function consultar() {
      try {
        const options = {
          params: new URLSearchParams(query),
          signal: controller.signal,
        };
        const response = await api.get(path, options);
        const data = response.data;
        if (allPages && data.paginacao?.totalPages > 1) {
          for (let page = 2; page <= data.paginacao.totalPages; page++) {
            const nextParams = new URLSearchParams(query);
            nextParams.set("page", String(page));
            const next = await api.get(path, {
              ...options,
              params: nextParams,
            });
            data.data.push(...next.data.data);
          }
        }
        if (!controller.signal.aborted)
          setResult({ data, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({ data: null, loading: false, error: mensagemErro(error) });
      }
    }
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        setResult((old) => ({ ...old, loading: true, error: "" }));
        consultar();
      }
    });
    return () => controller.abort();
  }, [path, query, revision, allPages]);
  return { ...result, reload };
}
