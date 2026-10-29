import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, useThemeStyles } from '../theme';
import { api } from '../services/api';
import { abrirArquivoNoDispositivo, rotuloAcaoDocumento, tipoDeDocumento } from '../services/documentos';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export function DocumentViewer({ visible, documento, onClose }) {
  const { colors, styles } = useThemeStyles(createStyles);
  const { width, height } = useWindowDimensions();
  const [uri, setUri] = useState('');
  const [mime, setMime] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [metodoAbertura, setMetodoAbertura] = useState('');
  const [erro, setErro] = useState('');
  const [zoom, setZoom] = useState(1);
  const [imagemKey, setImagemKey] = useState(0);
  const cache = useRef(new Map());
  const jaAbriu = useRef(false);
  const requisicaoAtual = useRef(0);

  const tipo = tipoDeDocumento(mime || documento?.mime, documento?.nome);
  const chave = documento?.uri
    ? `local:${documento.uri}`
    : `doc:${documento?.contratoId}:${documento?.documentoId}`;

  const carregar = useCallback(async () => {
    const versao = ++requisicaoAtual.current;

    if (!documento) {
      setErro('Arquivo indisponível para visualização.');
      return;
    }

    setErro('');
    setUri('');
    setMime(documento.mime || '');
    setAberto(false);
    setMetodoAbertura('');
    setZoom(1);
    setImagemKey((valor) => valor + 1);

    if (documento.uri) {
      setUri(documento.uri);
      setCarregando(false);
      return;
    }

    if (!documento.contratoId || !documento.documentoId) {
      setCarregando(false);
      setErro('Arquivo indisponível para visualização.');
      return;
    }

    const emCache = cache.current.get(chave);
    if (emCache) {
      setUri(emCache.uri);
      setMime(emCache.mime);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const baixado = await api.baixarDocumento({
        contratoId: documento.contratoId,
        documentoId: documento.documentoId,
        nome: documento.nome,
        mime: documento.mime,
      });
      if (versao !== requisicaoAtual.current) return;
      cache.current.set(chave, baixado);
      setUri(baixado.uri);
      setMime(baixado.mime);
    } catch (error) {
      if (versao !== requisicaoAtual.current) return;
      setErro(error.message || 'Não foi possível carregar o documento.');
    } finally {
      if (versao === requisicaoAtual.current) setCarregando(false);
    }
  }, [documento, chave]);

  useEffect(() => {
    if (!visible || !documento) return;
    jaAbriu.current = false;
    carregar();
  }, [visible, chave, carregar]);

  const abrirNoVisualizador = useCallback(async () => {
    if (!uri || abrindo) return;
    setAbrindo(true);
    setErro('');
    setAberto(false);
    setMetodoAbertura('');
    try {
      const resultado = await abrirArquivoNoDispositivo(uri, { mime, nome: documento?.nome });
      setMetodoAbertura(resultado?.metodo || 'visualizador');
      setAberto(true);
    } catch (error) {
      setErro(error.message || 'Não foi possível abrir o documento no visualizador do dispositivo.');
    } finally {
      setAbrindo(false);
    }
  }, [uri, mime, documento?.nome, abrindo]);

  useEffect(() => {
    if (!visible || tipo !== 'pdf' || !uri || carregando || jaAbriu.current) return;
    jaAbriu.current = true;
    abrirNoVisualizador();
  }, [visible, tipo, uri, carregando, abrirNoVisualizador]);

  function tentarAbrirNovamente() {
    jaAbriu.current = true;
    abrirNoVisualizador();
  }

  function tentarImagemNovamente() {
    setErro('');
    setImagemKey((valor) => valor + 1);
  }

  function fechar() {
    requisicaoAtual.current += 1;
    setUri('');
    setMime('');
    setCarregando(false);
    setAbrindo(false);
    setAberto(false);
    setMetodoAbertura('');
    setErro('');
    setZoom(1);
    onClose();
  }

  const nome = documento?.nome || 'Documento';
  const larguraImagem = Math.max(width, 1);
  const alturaImagem = Math.max(height - 140, 240);
  const erroDeAbertura = Boolean(uri) && (tipo === 'pdf' || tipo === 'outro');
  const erroDeImagem = Boolean(uri) && tipo === 'imagem';

  function renderErro() {
    let acao = carregar;
    let titulo = 'Não foi possível carregar o documento';

    if (erroDeAbertura) {
      acao = tentarAbrirNovamente;
      titulo = 'Não foi possível abrir o documento';
    } else if (erroDeImagem) {
      acao = tentarImagemNovamente;
      titulo = 'Não foi possível exibir a imagem';
    }

    return (
      <View style={styles.card}>
        <View style={[styles.iconCircle, styles.iconDanger]}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
        </View>
        <Text style={styles.cardTitle}>{titulo}</Text>
        <Text style={styles.cardText}>{erro}</Text>
        <PrimaryButton title="Tentar novamente" onPress={acao} style={styles.cardButton} />
        <SecondaryButton title="Fechar" onPress={fechar} style={styles.cardButton} />
      </View>
    );
  }

  function renderPdf() {
    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text-outline" size={40} color={colors.accent} />
        </View>
        <Text style={styles.cardTitle}>
          {aberto ? 'PDF aberto no dispositivo' : 'Preparando PDF...'}
        </Text>
        <Text style={styles.cardText}>
          {aberto
            ? metodoAbertura === 'compartilhamento'
              ? 'O PDF foi enviado ao seletor de compartilhamento do dispositivo. Escolha um aplicativo para visualizá-lo.'
              : metodoAbertura === 'link'
                ? 'O documento foi enviado ao navegador ou aplicativo compatível do dispositivo.'
                : 'O PDF foi enviado ao visualizador de documentos do dispositivo. Volte para continuar a revisão.'
            : 'Aguarde enquanto o PDF é preparado e aberto no visualizador do dispositivo.'}
        </Text>
        {!aberto ? (
          <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
        ) : null}
        {aberto ? (
          <PrimaryButton
            title={rotuloAcaoDocumento('application/pdf', nome)}
            onPress={tentarAbrirNovamente}
            style={styles.cardButton}
          />
        ) : null}
        <SecondaryButton title="Fechar" onPress={fechar} style={styles.cardButton} />
      </View>
    );
  }

  function renderImagem() {
    return (
      <ScrollView
        style={styles.imageScroll}
        contentContainerStyle={[
          styles.imageScrollContent,
          { minHeight: alturaImagem * zoom, minWidth: larguraImagem * zoom },
        ]}
        maximumZoomScale={3}
        minimumZoomScale={1}
        centerContent
        bounces={false}
      >
        <ScrollView horizontal bounces={false}>
          <Image
            key={imagemKey}
            source={{ uri }}
            style={{ width: larguraImagem * zoom, height: alturaImagem * zoom }}
            resizeMode="contain"
            onError={() =>
              setErro('Não foi possível exibir esta imagem. O arquivo pode estar corrompido ou indisponível.')
            }
          />
        </ScrollView>
      </ScrollView>
    );
  }

  function renderOutro() {
    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-attach-outline" size={40} color={colors.accent} />
        </View>
        <Text style={styles.cardTitle}>Formato não suportado</Text>
        <Text style={styles.cardText}>
          Este formato não pode ser visualizado dentro do aplicativo. Tente abrir com outro aplicativo instalado.
        </Text>
        {abrindo ? <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} /> : null}
        {aberto ? <Text style={styles.cardText}>Documento enviado ao aplicativo escolhido.</Text> : null}
        <PrimaryButton title="Abrir com outro aplicativo" onPress={tentarAbrirNovamente} style={styles.cardButton} />
        <SecondaryButton title="Fechar" onPress={fechar} style={styles.cardButton} />
      </View>
    );
  }

  function renderConteudo() {
    if (carregando || (documento && !uri && !erro)) {
      return (
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.cardTitle}>Carregando documento</Text>
          <Text style={styles.cardText}>Preparando o arquivo para visualização...</Text>
        </View>
      );
    }

    if (erro) return renderErro();
    if (tipo === 'imagem' && uri) return renderImagem();
    if (tipo === 'pdf' && uri) return renderPdf();
    if (tipo === 'outro' && uri) return renderOutro();

    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-outline" size={40} color={colors.accent} />
        </View>
        <Text style={styles.cardTitle}>Visualização indisponível</Text>
        <Text style={styles.cardText}>Não foi possível identificar o tipo deste documento.</Text>
        <SecondaryButton title="Fechar" onPress={fechar} style={styles.cardButton} />
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={fechar} statusBarTranslucent>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={fechar} style={styles.headerButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{nome}</Text>
          {tipo === 'imagem' && uri && !erro ? (
            <TouchableOpacity onPress={() => setZoom((valor) => (valor === 1 ? 2 : 1))} style={styles.zoomButton}>
              <Ionicons name="resize-outline" size={18} color={colors.accent} />
              <Text style={styles.zoomText}>{zoom === 1 ? 'Ampliar' : 'Reduzir'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>
        <View style={styles.body}>{renderConteudo()}</View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.header,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBorder,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginHorizontal: spacing.sm,
  },
  zoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  zoomText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  body: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconDanger: {
    backgroundColor: colors.dangerLight,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cardText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  cardButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  spinner: {
    marginBottom: spacing.md,
  },
  imageScroll: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  imageScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
