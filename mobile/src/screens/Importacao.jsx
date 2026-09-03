import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../utils/theme';
import { Header, PrimaryButton } from '../components';

const passos = [
  {
    id: 1,
    title: 'Escolha o formato',
    subtitle: 'Excel (.xlsx), CSV ou PDF',
    icon: 'document-text-outline',
  },
  {
    id: 2,
    title: 'Selecione o arquivo',
    subtitle: 'Compra ou anexo do sistema legado',
    icon: 'folder-open-outline',
  },
  {
    id: 3,
    title: 'Revise os dados',
    subtitle: 'Conferência antes de importar',
    icon: 'eye-outline',
  },
];

export function Importacao() {
  const navigation = useNavigation();
  const [arquivo, setArquivo] = useState(null);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Importação" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.dropArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-upload-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.dropTitle}>Arraste seu arquivo aqui</Text>
          <Text style={styles.dropSub}>ou toque para selecionar</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => setArquivo('planilha_contratos.xlsx')}>
            <Ionicons name="folder-outline" size={18} color={colors.primary} />
            <Text style={styles.browseText}>Escolher arquivo</Text>
          </TouchableOpacity>
        </View>

        {arquivo && (
          <View style={styles.fileCard}>
            <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{arquivo}</Text>
              <Text style={styles.fileSize}>24.6 KB</Text>
            </View>
            <TouchableOpacity onPress={() => setArquivo(null)}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Passos para importar</Text>
        <View style={styles.passos}>
          {passos.map((p, i) => (
            <View key={p.id} style={styles.passoRow}>
              <View style={styles.passoNumber}>
                <Text style={styles.passoNumberText}>{p.id}</Text>
              </View>
              <View style={styles.passoContent}>
                <Text style={styles.passoTitle}>{p.title}</Text>
                <Text style={styles.passoSub}>{p.subtitle}</Text>
              </View>
              {i < passos.length - 1 && <View style={styles.passoLine} />}
            </View>
          ))}
        </View>

        <View style={styles.nota}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.notaText}>
            Após a importação, você poderá revisar e confirmar os dados antes de salvar.
          </Text>
        </View>

        <PrimaryButton
          title={arquivo ? 'Continuar importação' : 'Selecionar arquivo'}
          onPress={() => {
            if (arquivo) navigation.navigate('RevisaoContrato');
            else setArquivo('planilha_contratos.xlsx');
          }}
          disabled={!arquivo}
        />
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
  dropArea: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.xxl,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  dropTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dropSub: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  browseText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  fileSize: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  passos: {
    marginBottom: spacing.lg,
  },
  passoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  passoNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoNumberText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  passoContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  passoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  passoSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nota: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  notaText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
});
