import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { Header, Input, PrimaryButton, SecondaryButton, ErrorState, LoadingState } from '../components';
import { api, normalizarErro } from '../services/api';

const FORMAS = ['PIX', 'BOLETO', 'CARTAO_CREDITO', 'TRANSFERENCIA', 'DINHEIRO'];

export function RevisaoContrato() {
  const navigation = useNavigation();
  const route = useRoute();
  const extracaoId = route.params?.extracaoId;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [modoCliente, setModoCliente] = useState('novo');
  const [clienteId, setClienteId] = useState(null);

  const [dados, setDados] = useState({
    cliente_nome: '',
    cpf_cnpj: '',
    numero: '',
    valor_total: '',
    quantidade_parcelas: '',
    vencimentosTexto: '',
    data_inicio: '',
    data_fim: '',
    forma_pagamento: 'PIX',
    juros_percentual: '0',
    multa_percentual: '0',
  });

  const [camposDetectados, setCamposDetectados] = useState([]);
  const [confianca, setConfianca] = useState(0);
  const [nomeArquivo, setNomeArquivo] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [extracao, clientesData] = await Promise.all([
        api.ocrGet(extracaoId),
        api.listClientes('', 1),
      ]);
      setClientes(clientesData.data || []);
      setNomeArquivo(extracao.nome_original || 'documento importado');
      setConfianca(Number(extracao.confianca || 0));
      setCamposDetectados(Object.keys(extracao.dados || {}));

      setDados({
        cliente_nome: extracao.dados.cliente_nome || '',
        cpf_cnpj: extracao.dados.cpf_cnpj || '',
        numero: extracao.dados.numero || '',
        valor_total: extracao.dados.valor_total != null ? String(extracao.dados.valor_total).replace('.', ',') : '',
        quantidade_parcelas: extracao.dados.quantidade_parcelas ? String(extracao.dados.quantidade_parcelas) : '',
        vencimentosTexto: extracao.dados.vencimentos ? extracao.dados.vencimentos.join(', ') : '',
        data_inicio: extracao.dados.data_inicio || '',
        data_fim: extracao.dados.data_fim || '',
        forma_pagamento: extracao.dados.forma_pagamento || 'PIX',
        juros_percentual: extracao.dados.juros_percentual != null ? String(extracao.dados.juros_percentual).replace('.', ',') : '0',
        multa_percentual: extracao.dados.multa_percentual != null ? String(extracao.dados.multa_percentual).replace('.', ',') : '0',
      });

      // se o OCR achou nome de cliente, mantém o modo "novo"; senão sugere seleção
      setModoCliente(extracao.dados.cliente_nome ? 'novo' : 'existente');
      if (extracao.dados.cliente_id && Number(extracao.dados.cliente_id) > 0) {
        setClienteId(Number(extracao.dados.cliente_id));
        setModoCliente('existente');
      }
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregando(false);
    }
  }, [extracaoId]);

  useEffect(() => {
    if (extracaoId) {
      carregar();
    } else {
      setCarregando(false);
      setErro('Nenhuma extração selecionada. Volte e importe um documento.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregar, extracaoId]);

  function setCampo(chave, valor) {
    setDados((prev) => ({ ...prev, [chave]: valor }));
  }

  function montarPayload() {
    const qtd = Number(dados.quantidade_parcelas.replace(',', '.'));
    const vencLista = dados.vencimentosTexto
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const payload = {
      numero: dados.numero.trim(),
      valor_total: Number(dados.valor_total.replace(',', '.')),
      quantidade_parcelas: qtd || undefined,
      forma_pagamento: dados.forma_pagamento,
      data_inicio: dados.data_inicio || undefined,
      data_fim: dados.data_fim || undefined,
      juros_percentual: Number(dados.juros_percentual.replace(',', '.')) || 0,
      multa_percentual: Number(dados.multa_percentual.replace(',', '.')) || 0,
    };

    if (modoCliente === 'existente' && clienteId) {
      payload.cliente_id = clienteId;
    } else {
      payload.cliente_novo = {
        nome_razao_social: dados.cliente_nome.trim(),
        cpf_cnpj: dados.cpf_cnpj.trim(),
      };
    }

    // só envia vencimentos se a quantidade bater (evita erro de validação no backend)
    if (vencLista.length > 0 && (!qtd || vencLista.length === qtd)) {
      payload.vencimentos = vencLista;
    } else if (vencLista.length > 0 && qtd && vencLista.length !== qtd) {
      payload.data_inicio = payload.data_inicio || vencLista[0];
      payload.data_fim = payload.data_fim || vencLista[vencLista.length - 1];
    }

    return payload;
  }

  async function confirmar() {
    setErro('');
    const payload = montarPayload();

    if (modoCliente === 'novo' && !payload.cliente_novo.nome_razao_social) {
      setErro('Informe o nome do cliente (ou selecione um existente).');
      return;
    }
    if (!payload.valor_total || payload.valor_total <= 0) {
      setErro('Valor total do contrato é obrigatório.');
      return;
    }
    if (!payload.quantidade_parcelas || payload.quantidade_parcelas < 1) {
      setErro('Informe a quantidade de parcelas.');
      return;
    }

    setConfirmando(true);
    try {
      const resultado = await api.ocrConfirmar(extracaoId, payload);
      navigation.replace('DetalheContrato', { contratoId: resultado.contrato_id });
    } catch (e) {
      setErro(normalizarErro(e));
      setConfirmando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Revisar informações" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando extração..." />
      </SafeAreaView>
    );
  }

  if (erro && !dados.numero && !dados.valor_total) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Revisar informações" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorState message={erro} onRetry={carregar} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Revisar informações" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.docHeader}>
          <View style={styles.docIcon}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName}>{nomeArquivo}</Text>
            <Text style={styles.docSize}>
              {confianca > 0 ? `Confiança da leitura: ${confianca}%` : 'Preencha os dados manualmente'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cliente</Text>
        <View style={styles.card}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, modoCliente === 'novo' && styles.tabActive]}
              onPress={() => setModoCliente('novo')}
            >
              <Text style={[styles.tabText, modoCliente === 'novo' && styles.tabTextActive]}>Novo cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, modoCliente === 'existente' && styles.tabActive]}
              onPress={() => setModoCliente('existente')}
            >
              <Text style={[styles.tabText, modoCliente === 'existente' && styles.tabTextActive]}>Existente</Text>
            </TouchableOpacity>
          </View>

          {modoCliente === 'novo' ? (
            <>
              <Input label="Nome / Razão social" placeholder="Nome do cliente" value={dados.cliente_nome} onChangeText={(v) => setCampo('cliente_nome', v)} />
              <Input label="CPF/CNPJ" placeholder="000.000.000-00" value={dados.cpf_cnpj} onChangeText={(v) => setCampo('cpf_cnpj', v)} />
            </>
          ) : (
            <>
              {clientes.length === 0 ? (
                <Text style={styles.muted}>Nenhum cliente cadastrado. Cadastre um cliente antes ou escolha "Novo cliente".</Text>
              ) : (
                clientes.slice(0, 20).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.clienteRow, clienteId === c.id && styles.clienteRowActive]}
                    onPress={() => setClienteId(c.id)}
                  >
                    <View style={styles.clienteInfo}>
                      <Text style={styles.clienteNome}>{c.nome_razao_social}</Text>
                      <Text style={styles.clienteSub}>{c.cpf_cnpj}</Text>
                    </View>
                    <Ionicons
                      name={clienteId === c.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={clienteId === c.id ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Contrato</Text>
        <View style={styles.card}>
          <Input label="Número do contrato" placeholder="CTR-0001" value={dados.numero} onChangeText={(v) => setCampo('numero', v)} />
          <Input label="Valor total (R$)" placeholder="24.000,00" value={dados.valor_total} onChangeText={(v) => setCampo('valor_total', v)} keyboardType="numeric" />
          <Input label="Quantidade de parcelas" placeholder="12" value={dados.quantidade_parcelas} onChangeText={(v) => setCampo('quantidade_parcelas', v)} keyboardType="number-pad" />
          <Input label="Vencimentos (separados por vírgula)" placeholder="2026-03-10, 2026-04-10" value={dados.vencimentosTexto} onChangeText={(v) => setCampo('vencimentosTexto', v)} />
          <Input label="Data de início (AAAA-MM-DD)" placeholder="2026-03-10" value={dados.data_inicio} onChangeText={(v) => setCampo('data_inicio', v)} />
          <Input label="Data de fim (AAAA-MM-DD)" placeholder="2027-02-10" value={dados.data_fim} onChangeText={(v) => setCampo('data_fim', v)} />
          <Input label="Juros ao mês (%)" placeholder="0,00" value={dados.juros_percentual} onChangeText={(v) => setCampo('juros_percentual', v)} keyboardType="numeric" />
          <Input label="Multa (%)" placeholder="0,00" value={dados.multa_percentual} onChangeText={(v) => setCampo('multa_percentual', v)} keyboardType="numeric" />

          <Text style={styles.fieldLabel}>Forma de pagamento</Text>
          <View style={styles.formasRow}>
            {FORMAS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.formaChip, dados.forma_pagamento === f && styles.formaChipActive]}
                onPress={() => setCampo('forma_pagamento', f)}
              >
                <Text style={[styles.formaText, dados.forma_pagamento === f && styles.formaTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {camposDetectados.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Campos detectados pelo OCR</Text>
            <View style={styles.card}>
              {camposDetectados.map((campo) => (
                <View key={campo} style={styles.campoDetectado}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.campoDetectadoText}>{campo}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        {confirmando ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <PrimaryButton title="Confirmar importação" onPress={confirmar} />
        )}
        <View style={styles.spacer} />
        <SecondaryButton title="Voltar" onPress={() => navigation.goBack()} />
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
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  docSize: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  tabTextActive: {
    color: colors.white,
  },
  clienteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clienteRowActive: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  clienteInfo: {
    flex: 1,
  },
  clienteNome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  clienteSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  muted: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  formasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formaChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formaText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  formaTextActive: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  campoDetectado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  campoDetectadoText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  spacer: {
    marginVertical: spacing.xs,
  },
});