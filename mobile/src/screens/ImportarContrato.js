import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, typography } from '../theme';
import { Header, PrimaryButton, SecondaryButton } from '../components';
import { api, normalizarErro } from '../services/api';

const ETAPAS = ['Upload', 'Processo', 'Revisão', 'Confirmação'];

const ORIGENS = [
  { key: 'pdf', icon: 'document-text-outline', title: 'Selecionar PDF', sub: 'Contrato em PDF' },
  { key: 'galeria', icon: 'images-outline', title: 'Galeria / Arquivos', sub: 'Imagem ou arquivo salvo' },
];

export function ImportarContrato() {
  const navigation = useNavigation();
  const route = useRoute();
  const [origem, setOrigem] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [salvo, setSalvo] = useState(null);
  const [erro, setErro] = useState('');

  const etapaAtual = origem == null ? 0 : processando ? 1 : salvo ? 2 : 0;

  async function escolher(o) {
    setErro('');
    setOrigem(o);
    setProcessando(true);
    setSalvo(null);

    try {
      const tipo = o.key === 'pdf'
        ? ['application/pdf']
        : ['image/jpeg', 'image/png', 'image/webp'];

      const picked = await DocumentPicker.getDocumentAsync({
        type: tipo,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled || !picked.assets || picked.assets.length === 0) {
        setOrigem(null);
        setProcessando(false);
        return;
      }

      const asset = picked.assets[0];
      const resultado = await api.ocrExtract({
        uri: asset.uri,
        nome: asset.name || 'documento.pdf',
        mime: asset.mimeType || 'application/pdf',
      });

      setSalvo({
        nomeArquivo: asset.name || 'documento.pdf',
        extracaoId: resultado.extracao_id,
        dados: resultado.dados || {},
        campos: resultado.campos || [],
        confianca: resultado.confianca || 0,
        aviso: resultado.aviso || null,
      });
    } catch (e) {
      setErro(normalizarErro(e));
      setSalvo(null);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Importação Inteligente IA" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.stepper}>
          {ETAPAS.map((e, i) => (
            <React.Fragment key={e}>
              <View style={styles.stepWrap}>
                <View
                  style={[styles.stepCircle, (i <= etapaAtual || salvo) && styles.stepCircleActive]}
                >
                  {i < etapaAtual || (salvo && i < 3)
                    ? <Ionicons name="checkmark" size={14} color={colors.white} />
                    : <Text style={[styles.stepNum, (i <= etapaAtual) && styles.stepNumActive]}>{i + 1}</Text>}
                </View>
                <Text style={[styles.stepLabel, (i <= etapaAtual) && styles.stepLabelActive]}>{e}</Text>
              </View>
              {i < ETAPAS.length - 1 && <View style={[styles.stepLine, i < etapaAtual && styles.stepLineActive]} />}
            </React.Fragment>
          ))}
        </View>

        {!origem ? (
          <>
            <Text style={styles.caption}>Como deseja importar o contrato?</Text>
            {ORIGENS.map((o) => (
              <TouchableOpacity key={o.key} style={styles.origemCard} onPress={() => escolher(o)} activeOpacity={0.7}>
                <View style={styles.origemIcon}>
                  <Ionicons name={o.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.origemInfo}>
                  <Text style={styles.origemTitle}>{o.title}</Text>
                  <Text style={styles.origemSub}>{o.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        ) : processando ? (
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingTitle}>Processando documento</Text>
            <Text style={styles.processingSub}>
              Enviando ao servidor e lendo os dados com OCR... isso pode levar alguns segundos.
            </Text>
          </View>
        ) : salvo ? (
          <View style={styles.doneCard}>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={40} color={colors.success} />
            </View>
            <Text style={styles.doneTitle}>Documento processado!</Text>
            <Text style={styles.doneSub}>
              {salvo.confianca > 0
                ? `Confiança da leitura: ${salvo.confianca}%. Revise os dados detectados antes de confirmar.`
                : 'Nenhum dado foi detectado automaticamente. Preencha manualmente na revisão.'}
            </Text>
            {salvo.aviso ? <Text style={styles.aviso}>{salvo.aviso}</Text> : null}
            <View style={styles.fileRow}>
              <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
              <Text style={styles.fileName}>{salvo.nomeArquivo}</Text>
            </View>
            <PrimaryButton
              title="Revisar dados"
              onPress={() =>
                navigation.navigate('RevisaoContrato', {
                  extracaoId: salvo.extracaoId,
                })
              }
            />
            <View style={styles.spacer} />
            <SecondaryButton title="Refazer" onPress={() => setOrigem(null)} />
          </View>
        ) : (
          <View style={styles.doneCard}>
            <View style={[styles.doneIcon, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert" size={40} color={colors.danger} />
            </View>
            <Text style={styles.doneTitle}>Não foi possível processar</Text>
            <Text style={styles.doneSub}>{erro}</Text>
            <View style={styles.spacer} />
            <SecondaryButton title="Tentar novamente" onPress={() => setOrigem(null)} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  stepWrap: {
    alignItems: 'center',
    width: 64,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNum: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
  },
  stepNumActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 14,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  caption: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  origemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  origemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  origemInfo: {
    flex: 1,
  },
  origemTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  origemSub: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  processingCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  processingTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  processingSub: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  doneCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  doneTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  doneSub: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  aviso: {
    fontSize: typography.sizes.sm,
    color: colors.warning || '#B45309',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignSelf: 'stretch',
  },
  fileName: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  spacer: {
    marginVertical: spacing.xs,
  },
});