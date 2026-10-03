import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_URL, apiClient } from "./api";
import { getToken } from "./storage";

export async function baixarArquivo(path, nome, params) {
  const filename = nome.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (Platform.OS === "web") {
    let result;
    try {
      result = await apiClient.get(path, {
        params,
        responseType: "blob",
        timeout: 60000,
      });
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        try {
          error.response.data = JSON.parse(await error.response.data.text());
        } catch {
          /* Preserva a resposta de erro original. */
        }
      }
      throw error;
    }
    const url = URL.createObjectURL(result.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  // Valida a sessão na API antes de baixar pelo serviço nativo de arquivos.
  await apiClient.get("/auth/me");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "Compartilhamento de arquivos indisponível neste aparelho.",
    );
  const search = new URLSearchParams(
    Object.entries(params || {}).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
  const token = await getToken();
  const target = new File(Paths.cache, Date.now() + "-" + filename);
  try {
    const file = await File.downloadFileAsync(
      API_URL.replace(/\/$/, "") + path + (search.size ? "?" + search : ""),
      target,
      { headers: { Authorization: "Bearer " + token }, idempotent: true },
    );
    await Sharing.shareAsync(file.uri);
  } finally {
    if (target.exists) target.delete();
  }
}
