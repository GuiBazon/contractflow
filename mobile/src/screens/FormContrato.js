import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { Header, Input, PrimaryButton, LoadingState, ErrorState } from '../components';
import { api, normalizarErro } from '../services/api';

const FORMAS = ['PIX', 'Transferência', 'Boleto', 'Dinheiro', 'Cartão de Crédito'];

function formatValueInput(valor) {
  return valor !== undefined && valor !== null ? String(valor).replace('.', ',') : '';
}

export function FormContrato() {
  const route = useRoute();
  const navigation = useNavigation();
  const contratoId = route.params?.contratoId;

  const [carregando, setCarregando] = useState(Boolean(contratoId));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [mostrarClientes, setMostrarClientes] = useState(false);

  const [form, setForm] = useState({
    numero: '',
    descricao: '',
    tipo: '',
    valor_total: '',
    quantidade_parcelas: '',
    data_inicio: '',
    data_fim: '',
    forma_pagamento: 'PIX',
    juros_percentual: '',
    multa_percentual: '',
    observacoes: '',
  });

  function setCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  useEffect(() => {
    api
      .listClientes('', 1)
      .then((data) => setClientes(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contratoId) return;
    let ativo = true;
    async function carregar() {
      try {
        setErro('');
        const contrato = await api.getContrato(contratoId);
        if (!ativo) return;
        setForm({
          numero: contrato.numero || '',
          descricao: contrato.descricao || '',
          tipo: contrato.tipo || '',
          valor_total: formatValueInput(contrato.valor_total),
          quantidade_parcelas: String(contrato.quantidade_parcelas || ''),
          data_inicio: contrato.data_inicio ? String(contrato.data_inicio).split('T')[0] : '',
          data_fim: contrato.data_fim ? String(contrato.data_fim).split('T')[0] : '',
          forma_pagamento: contrato.forma_pagamento || 'PIX',
          juros_percentual: formatValueInput(contrato.juros_percentual),
          multa_percentual: formatValueInput(contrato.multa_percentual),
          observacoes: contrato.observacoes || '',
        });
        setClienteSelecionado({
          id: contrato.cliente_id,
          nome: contrato.cliente_nome,
        });
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [contratoId]);

  async function handleSalvar() {
    setErro('');
    if (!clienteSelecionado) {
      setErro('Selecione o cliente do contrato.');
      return;
    }
    if (!form.numero.trim()) {
      setErro('Informe o número do contrato.');
      return;
    }
    if (!form.valor_total || Number(String(form.valor_total).replace(',', '.')) < 0) {
      setErro('Informe um valor total válido.');
      return;
    }

    const dados = {
      cliente_id: clienteSelecionado.id,
      numero: form.numero.trim(),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo.trim() || null,
      valor_total: Number(String(form.valor_total).replace(',', '.')),
      quantidade_parcelas: form.quantidade_parcelas
        ? Number(form.quantidade_parcelas)
        : undefined,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      forma_pagamento: form.forma_pagamento,
      juros_percentual: form.juros_percentual
        ? Number(String(form.juros_percentual).replace(',', '.'))
        : 0,
      multa_percentual: form.multa_percentual
        ? Number(String(form.multa_percentual).replace(',', '.'))
        : 0,
      observacoes: form.observacoes.trim() || null,
    };

    setSalvando(true);
    try {
      if (contratoId) {
        await api.updateContrato(contratoId, dados);
      } else {
        if (!dados.quantidade_parcelas) {
          setErro('Informe a quantidade de parcelas.');
          setSalvando(false);
          return;
        }
        await api.createContrato(dados);
      }
      if (route.params?.callback) {
        route.params.callback(true);
      }
      navigation.goBack();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Editar contrato" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando contrato..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title={contratoId ? 'Editar contrato' : 'Novo contrato'}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}

          <Text style={styles.sectionTitle}>Cliente *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setMostrarClientes((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            {clienteSelecionado ? (
              <Text style={styles.selectorText}>{clienteSelecionado.nome}</Text>
            ) : (
              <Text style={styles.selectorPlaceholder}>Selecione o cliente</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {mostrarClientes ? (
            <View style={styles.listaClientes}>
              {clientes.length === 0 ? (
                <Text style={styles.listaVazia}>Nenhum cliente cadastrado. Cadastre um cliente primeiro.</Text>
              ) : (
                clientes.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.clienteItem}
                    onPress={() => {
                      setClienteSelecionado({ id: c.id, nome: c.nome_razao_social });
                      setMostrarClientes(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clienteNome}>{c.nome_razao_social}</Text>
                    <Text style={styles.clienteDoc}>{c.cpf_cnpj}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Dados do contrato</Text>
          <Input
            label="Número do contrato *"
            placeholder="Ex.: CT-2026-001"
            value={form.numero}
            onChangeText={(v) => setCampo('numero', v)}
            autoCapitalize="characters"
          />
          <Input
            label="Descrição"
            placeholder="Ex.: Prestação de serviços"
            value={form.descricao}
            onChangeText={(v) => setCampo('descricao', v)}
          />
          <Input
            label="Tipo"
            placeholder="Ex.: Serviço, Venda..."
            value={form.tipo}
            onChangeText={(v) => setCampo('tipo', v)}
          />

          <View style={styles.row2}>
            <View style={styles.flexLg}>
              <Input
                label="Valor total (R$) *"
                placeholder="0,00"
                value={form.valor_total}
                onChangeText={(v) => setCampo('valor_total', v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flexSm}>
              <Input
                label="Parcelas"
                placeholder="12"
                value={form.quantidade_parcelas}
                onChangeText={(v) => setCampo('quantidade_parcelas', v)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.flexSm}>
              <Input
                label="Início"
                placeholder="AAAA-MM-DD"
                value={form.data_inicio}
                onChangeText={(v) => setCampo('data_inicio', v)}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.flexLg}>
              <Input
                label="Fim"
                placeholder="AAAA-MM-DD"
                value={form.data_fim}
                onChangeText={(v) => setCampo('data_fim', v)}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={styles.metodoLabel}>Forma de pagamento</Text>
          <View style={styles.metodos}>
            {FORMAS.map((m) => (
              <TouchableOpacity
                key={m}
                style={styles.metodoItem}
                onPress={() => setCampo('forma_pagamento', m)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={form.forma_pagamento === m ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={form.forma_pagamento === m ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.metodoText,
                    form.forma_pagamento === m && styles.metodoTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row2}>
            <View style={styles.flexSm}>
              <Input
                label="Juros %"
                placeholder="0,0"
                value={form.juros_percentual}
                onChangeText={(v) => setCampo('juros_percentual', v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flexSm}>
              <Input
                label="Multa %"
                placeholder="0,0"
                value={form.multa_percentual}
                onChangeText={(v) => setCampo('multa_percentual', v)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Input
            label="Observações"
            placeholder="Informações adicionais"
            value={form.observacoes}
            onChangeText={(v) => setCampo('observacoes', v)}
            multiline
          />

          {salvando ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <PrimaryButton
              title={contratoId ? 'Salvar alterações' : 'Criar contrato'}
              onPress={handleSalvar}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  erroTexto: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  selectorText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  selectorPlaceholder: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  listaClientes: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  listaVazia: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  clienteItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clienteNome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  clienteDoc: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 1,
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexSm: {
    flex: 0.45,
  },
  flexLg: {
    flex: 0.55,
  },
  metodoLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  metodos: {
    marginBottom: spacing.md,
  },
  metodoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metodoText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  metodoTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
});