import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, typography } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';
import { api, normalizarErro } from '../services/api';
import { Header, StatusBadge, InstallmentCard, TimelineItem, PrimaryButton, LoadingState, ErrorState, Input } from '../components';

const STATUS_DISPONIVEIS = ['ATIVO', 'PENDENTE', 'ENCERRADO', 'CANCELADO', 'EM_RENOVACAO'];

const tabs = [
  { key: 'parcelas', label: 'Parcelas', icon: 'layers-outline' },
  { key: 'pagamentos', label: 'Pagamentos', icon: 'cash-outline' },
  { key: 'documentos', label: 'Documentos', icon: 'attach-outline' },
  { key: 'timeline', label: 'Timeline', icon: 'time-outline' },
];

const TITULOS_HISTORICO = {
  CRIADO: 'Contrato criado',
  ALTERADO: 'Contrato editado',
  PAGAMENTO: 'Pagamento registrado',
  PARCELA_ALTERADA: 'Parcela alterada',
  PARCELAS: 'Parcelas geradas',
  STATUS: 'Status alterado',
  DOCUMENTO: 'Documento adicionado',
};

function tituloHistorico(acao) {
  return TITULOS_HISTORICO[acao] || acao;
}

export function DetalheContrato() {
  const route = useRoute();
  const navigation = useNavigation();
  const [tab, setTab] = useState('parcelas');
  const contratoId = route.params?.contratoId;

  const [contrato, setContrato] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const [qtdParcelasForm, setQtdParcelasForm] = useState('');
  const [gerandoParcelas, setGerandoParcelas] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setErro('');
      const [contratoData, parcelasData, pagamentosData, historicoData, documentosData] = await Promise.all([
        api.getContrato(contratoId),
        api.listParcelas(contratoId),
        api.listPagamentos(contratoId),
        api.getHistorico(contratoId),
        api.listDocumentos(contratoId).catch(() => ({ data: [] })),
      ]);
      setContrato(contratoData);
      setParcelas(parcelasData.data || []);
      setPagamentos(pagamentosData.data || []);
      setHistorico(Array.isArray(historicoData) ? historicoData : []);
      setDocumentos(documentosData.data || []);
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function mudarStatus(status) {
    if (!contrato || status === contrato.status) return;
    try {
      setErro('');
      await api.updateContratoStatus(contratoId, status);
      await carregar();
    } catch (e) {
      setErro(normalizarErro(e));
    }
  }

  async function adicionarDocumento() {
    setErro('');
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets || picked.assets.length === 0) return;

      const asset = picked.assets[0];
      setEnviandoDoc(true);
      await api.uploadDocumento(contratoId, {
        uri: asset.uri,
        nome: asset.name || 'anexo.pdf',
        mime: asset.mimeType || 'application/pdf',
        tipo: 'ANEXO',
        descricao: 'Anexo adicionado pelo app',
      });
      await carregar();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setEnviandoDoc(false);
    }
  }

  async function gerarParcelas() {
    const qtd = Number(qtdParcelasForm);
    if (!qtd || !Number.isInteger(qtd) || qtd < 1) {
      setErro('Informe a quantidade de parcelas para gerar.');
      return;
    }
    setErro('');
    setGerandoParcelas(true);
    try {
      await api.generateParcelas(contratoId, { quantidade_parcelas: qtd });
      await carregar();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setGerandoParcelas(false);
    }
  }

  function confirmarExclusaoDoc(doc) {
    Alert.alert(
      'Remover anexo',
      `Excluir "${doc.nome_original}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDocumento(contratoId, doc.id);
              await carregar();
            } catch (e) {
              setErro(normalizarErro(e));
            }
          },
        },
      ]
    );
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Detalhes" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando contrato..." />
      </SafeAreaView>
    );
  }

  if (erro || !contrato) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Detalhes" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorState message={erro || 'Contrato não encontrado'} onRetry={() => setCarregando(true)} />
      </SafeAreaView>
    );
  }

  const totalParcelas = parcelas.length;
  const parcelasPagas = parcelas.filter((p) => p.situacao === 'PAGA').length;
  const progress = totalParcelas > 0 ? parcelasPagas / totalParcelas : 0;
  const valorParcela = parcelas[0]?.valor || 0;
  const nome = contrato.descricao || contrato.tipo || contrato.numero || 'Contrato';

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Detalhes" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <Text style={styles.nome}>{nome}</Text>
              <Text style={styles.cliente}>{contrato.cliente_nome}</Text>
              <Text style={styles.codigo}>{contrato.numero}</Text>
            </View>
            <StatusBadge status={contrato.status} size="medium" />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="wallet-outline" size={16} color={colors.primary} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Valor total</Text>
                <Text style={styles.infoValue}>{formatCurrency(contrato.valor_total)}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Parcelas</Text>
                <Text style={styles.infoValue}>{parcelasPagas}/{totalParcelas}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso</Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          <Text style={styles.statusLabel}>Alterar status</Text>
          <View style={styles.statusChips}>
            {STATUS_DISPONIVEIS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusChip, contrato.status === s && styles.statusChipActive]}
                onPress={() => mudarStatus(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusChipText, contrato.status === s && styles.statusChipTextActive]}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}
        </View>

        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={t.icon} size={16} color={tab === t.key ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {tab === 'parcelas' && (
            parcelas.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="layers-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>Nenhuma parcela gerada</Text>
                <Input
                  label="Quantidade de parcelas"
                  placeholder={contrato.quantidade_parcelas ? String(contrato.quantidade_parcelas) : '12'}
                  value={qtdParcelasForm}
                  onChangeText={setQtdParcelasForm}
                  keyboardType="number-pad"
                />
                <PrimaryButton
                  title={gerandoParcelas ? 'Gerando...' : 'Gerar parcelas'}
                  disabled={gerandoParcelas}
                  onPress={gerarParcelas}
                />
              </View>
            ) : (
              parcelas.map((p) => <InstallmentCard key={p.id} parcela={p} />)
            )
          )}

          {tab === 'pagamentos' && (
            pagamentos.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="cash-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>Nenhum pagamento registrado</Text>
              </View>
            ) : (
              pagamentos.map((pg) => (
                <View key={pg.id} style={styles.pagamentoCard}>
                  <View style={styles.pagamentoLeft}>
                    <Text style={styles.pagamentoNumero}>#{String(pg.parcela_numero).padStart(2, '0')}</Text>
                  </View>
                  <View style={styles.pagamentoCenter}>
                    <Text style={styles.pagamentoValor}>{formatCurrency(pg.valor)}</Text>
                    <Text style={styles.pagamentoData}>{formatDate(pg.data_pagamento)}</Text>
                  </View>
                  <Text style={styles.pagamentoForma}>{pg.forma_pagamento}</Text>
                </View>
              ))
            )
          )}

          {tab === 'documentos' && (
            <View>
              <TouchableOpacity style={styles.uploadBtn} onPress={adicionarDocumento} disabled={enviandoDoc} activeOpacity={0.7}>
                {enviandoDoc ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.white} />
                )}
                <Text style={styles.uploadBtnText}>{enviandoDoc ? 'Enviando...' : 'Adicionar anexo'}</Text>
              </TouchableOpacity>

              {documentos.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="attach-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyTabText}>Nenhum documento vinculado</Text>
                </View>
              ) : (
                documentos.map((doc) => (
                  <View key={doc.id} style={styles.documentoCard}>
                    <View style={styles.documentoIcon}>
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.documentoInfo}>
                      <Text style={styles.documentoNome} numberOfLines={1}>{doc.nome_original}</Text>
                      <Text style={styles.documentoMeta}>
                        {doc.tipo} • {(doc.tamanho / 1024).toFixed(0)} KB
                      </Text>
                    </View>
                    {doc.tipo === 'ANEXO' ? (
                      <TouchableOpacity onPress={() => confirmarExclusaoDoc(doc)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'timeline' && (
            historico.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="time-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>Sem histórico</Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {historico.map((h, index) => (
                  <TimelineItem
                    key={h.id}
                    title={tituloHistorico(h.acao)}
                    date={formatDate(h.created_at)}
                    description={h.descricao}
                    icon="document-text-outline"
                    isLast={index === historico.length - 1}
                  />
                ))}
              </View>
            )
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Registrar pagamento"
          disabled={totalParcelas === 0}
          onPress={() => {
            const proxima = parcelas.find(
              (p) => p.situacao === 'PENDENTE' || p.situacao === 'VENCIDA'
            );
            if (proxima) {
              navigation.navigate('RegistrarPagamento', {
                contratoId: contrato.id,
                parcelaNumero: proxima.numero,
              });
            }
          }}
        />
      </View>
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
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  nome: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cliente: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  codigo: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoTextWrap: {},
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  progressSection: {},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  progressPct: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  uploadBtnText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  statusLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.medium,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  erroTexto: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  tabContent: {
    minHeight: 200,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.sm,
  },
  emptyTabText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  documentoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  documentoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentoInfo: {
    flex: 1,
  },
  documentoNome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  documentoMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  pagamentoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pagamentoLeft: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pagamentoNumero: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  pagamentoCenter: {
    flex: 1,
    marginRight: spacing.sm,
  },
  pagamentoValor: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  pagamentoData: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  pagamentoForma: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  timeline: {
    paddingLeft: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});