import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Modal, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { api, normalizarErro } from '../services/api';
import { Header, Input, PrimaryButton, LoadingState, ErrorState } from '../components';
import { hojeISO } from '../utils/format';

const FORMAS_PAGAMENTO = ['PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO'];

export function ContratoForm() {
  const navigation = useNavigation();

  const [clientes, setClientes] = useState([]);
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [dataFim, setDataFim] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('');
  const [juros, setJuros] = useState('');
  const [multa, setMulta] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    carregarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarClientes() {
    setCarregandoClientes(true);
    setErro('');
    try {
      const data = await api.listClientes('', 1);
      setClientes(data.data || []);
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregandoClientes(false);
    }
  }

  function validar() {
    if (!clienteId) return 'Selecione um cliente.';
    if (!numero.trim()) return 'Informe o número do contrato.';
    const valor = Number(String(valorTotal).replace(',', '.'));
    if (!valor || Number.isNaN(valor) || valor < 0) return 'Informe um valor total válido.';
    if (!formaPagamento) return 'Selecione a forma de pagamento.';
    const qtd = Number(quantidadeParcelas);
    if (!qtd || !Number.isInteger(qtd) || qtd < 1) return 'Informe a quantidade de parcelas (1 ou mais).';
    const dataRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dataRe.test(dataInicio)) return 'Data de início inválida (use AAAA-MM-DD).';
    if (dataFim && !dataRe.test(dataFim)) return 'Data de fim inválida (use AAAA-MM-DD).';
    if (dataFim && dataFim < dataInicio) return 'Data de fim anterior à data de início.';
    return '';
  }

  async function handleSalvar() {
    const msg = validar();
    if (msg) {
      setErro(msg);
      return;
    }

    const dados = {
      cliente_id: Number(clienteId),
      numero: numero.trim().toUpperCase(),
      tipo: tipo.trim() || null,
      descricao: descricao.trim() || null,
      valor_total: Number(String(valorTotal).replace(',', '.')),
      data_inicio: dataInicio,
      data_fim: dataFim || null,
      forma_pagamento: formaPagamento,
      quantidade_parcelas: Number(quantidadeParcelas),
      juros_percentual: Number(String(juros).replace(',', '.')) || 0,
      multa_percentual: Number(String(multa).replace(',', '.')) || 0,
      observacoes: observacoes.trim() || null,
    };

    setSalvando(true);
    setErro('');
    try {
      await api.createContrato(dados);
      navigation.goBack();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setSalvando(false);
    }
  }

  function selecionarCliente(cliente) {
    setClienteId(String(cliente.id));
    setClienteNome(cliente.nome_razao_social);
    setSeletorAberto(false);
  }

  if (carregandoClientes) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Novo contrato" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando clientes..." />
      </SafeAreaView>
    );
  }

  if (erro && clientes.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Novo contrato" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorState message={erro} onRetry={carregarClientes} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Novo contrato" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Cliente e identificação</Text>

        <TouchableOpacity style={styles.clientPicker} onPress={() => setSeletorAberto(true)} activeOpacity={0.7}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <Text style={clienteNome ? styles.clientText : styles.clientPlaceholder}>
            {clienteNome || 'Selecione o cliente *'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.rowNumero}>
            <Input label="Número *" placeholder="CT-0001" value={numero} onChangeText={setNumero} autoCapitalize="characters" />
          </View>
          <View style={styles.rowTipo}>
            <Input label="Tipo" placeholder="Ex.: Prestação de serviço" value={tipo} onChangeText={setTipo} />
          </View>
        </View>
        <Input label="Descrição" placeholder="Resumo do contrato" value={descricao} onChangeText={setDescricao} />

        <Text style={styles.sectionTitle}>Valores</Text>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Input label="Valor total (R$) *" placeholder="0,00" value={valorTotal} onChangeText={setValorTotal} keyboardType="numeric" />
          </View>
          <View style={styles.rowItem}>
            <Input label="Qtd. parcelas *" placeholder="12" value={quantidadeParcelas} onChangeText={setQuantidadeParcelas} keyboardType="number-pad" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Input label="Juros (% a.m.)" placeholder="0,00" value={juros} onChangeText={setJuros} keyboardType="numeric" />
          </View>
          <View style={styles.rowItem}>
            <Input label="Multa (%)" placeholder="0,00" value={multa} onChangeText={setMulta} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Período e pagamento</Text>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Input label="Data de início *" placeholder="AAAA-MM-DD" value={dataInicio} onChangeText={setDataInicio} />
          </View>
          <View style={styles.rowItem}>
            <Input label="Data fim" placeholder="AAAA-MM-DD" value={dataFim} onChangeText={setDataFim} />
          </View>
        </View>
        <Text style={styles.label}>Forma de pagamento *</Text>
        <View style={styles.formas}>
          {FORMAS_PAGAMENTO.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.formaItem, formaPagamento === f && styles.formaItemActive]}
              onPress={() => setFormaPagamento(f)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={formaPagamento === f ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={formaPagamento === f ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.formaText, formaPagamento === f && styles.formaTextActive]}>
                {f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Observações" placeholder="Condições e detalhes adicionais" value={observacoes} onChangeText={setObservacoes} multiline />

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        {salvando ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <PrimaryButton title="Criar contrato" onPress={handleSalvar} />
        )}
        <View style={styles.spacer} />

        <Text style={styles.hint}>
          Ao criar, o contrato terá {quantidadeParcelas || 'N'} parcela(s) geradas automaticamente a partir da data de início.
        </Text>
      </ScrollView>

      <Modal visible={seletorAberto} animationType="slide" transparent onRequestClose={() => setSeletorAberto(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar cliente</Text>
              <TouchableOpacity onPress={() => setSeletorAberto(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={clientes}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => selecionarCliente(item)}>
                  <Text style={styles.modalItemNome}>{item.nome_razao_social}</Text>
                  <Text style={styles.modalItemDoc}>{item.cpf_cnpj}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Nenhum cliente cadastrado. Cadastre um cliente antes de criar o contrato.</Text>}
            />
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  clientPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  clientText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  clientPlaceholder: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  rowNumero: {
    flex: 1,
  },
  rowTipo: {
    flex: 2,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.medium,
  },
  formas: {
    marginBottom: spacing.lg,
  },
  formaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formaItemActive: {},
  formaText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  formaTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
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
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  modalItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemNome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  modalItemDoc: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalEmpty: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});