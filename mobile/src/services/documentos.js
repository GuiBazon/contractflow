import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

const MIMES_IMAGEM = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function tipoDeDocumento(mime, nome) {
  const tipo = String(mime || '').toLowerCase().split(';')[0];
  if (tipo === 'application/pdf' || /\.pdf$/i.test(String(nome || ''))) return 'pdf';
  if (MIMES_IMAGEM.has(tipo) || /\.(jpe?g|png|webp)$/i.test(String(nome || ''))) return 'imagem';
  return 'outro';
}

export function rotuloAcaoDocumento(mime, nome) {
  const tipo = tipoDeDocumento(mime, nome);

  if (tipo === 'pdf') {
    return Platform.OS === 'ios' ? 'Abrir ou compartilhar PDF' : 'Abrir PDF';
  }

  if (tipo === 'imagem') {
    return 'Visualizar imagem';
  }

  return 'Abrir documento';
}

export async function abrirArquivoNoDispositivo(uri, { mime, nome } = {}) {
  if (!uri) {
    throw new Error('Arquivo indisponível para abertura.');
  }

  const tipo = tipoDeDocumento(mime, nome);
  const tipoMime = mime || (tipo === 'pdf' ? 'application/pdf' : '*/*');

  if (Platform.OS === 'android') {
    try {
      const contentUri = uri.startsWith('content://')
        ? uri
        : await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: tipoMime,
        extra: { 'android.intent.extra.TITLE': nome || 'Documento' },
      });
      return { metodo: 'visualizador' };
    } catch (error) {
      throw new Error(
        'Não foi possível abrir o documento. Verifique se há um aplicativo compatível instalado.'
      );
    }
  }

  if (Platform.OS === 'ios') {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: tipoMime,
          UTI: tipo === 'pdf' ? 'com.adobe.pdf' : undefined,
          dialogTitle: tipo === 'pdf' ? 'Abrir ou compartilhar PDF' : 'Abrir documento',
        });
        return { metodo: 'compartilhamento' };
      }
    } catch (error) {
      throw new Error('Não foi possível abrir o documento no visualizador do dispositivo.');
    }
  }

  try {
    await Linking.openURL(uri);
    return { metodo: 'link' };
  } catch (error) {
    throw new Error('Não foi possível abrir o documento neste dispositivo.');
  }
}
