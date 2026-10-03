import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useDados from '../hooks/useDados';
import { api, normalizarErro } from '../services/api';
import { Screen, s } from '../components/SprintUI';
import { Input, FilterChip, PrimaryButton, SecondaryButton } from '../components';
import { hojeISO, parseValor } from '../utils/format';
import { Alert } from '../utils/alert';

export function DespesaForm() {
  const route = useRoute();
  const id = route.params?.despesaId;
  const initial = route.params?.despesa;
  const query = useDados(useCallback(() => id ? api.getDespesa(id) : Promise.resolve(initial || {}), [id, initial]));
  return <Screen title={id || initial?.id ? 'Editar despesa' : 'Nova despesa'} back query={query}>{query.data ? <Editor key={query.data.id || 'novo'} initial={query.data} /> : null}</Screen>;
}
function Editor({ initial }) {
  const navigation = useNavigation();
  const [values, setValues] = useState({ descricao: '', categoria: '', valor: '', data: hojeISO(), status: 'PENDENTE', observacoes: '', ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paid = initial.status === 'PAGA';
  async function salvar() {
    setBusy(true); setError('');
    const payload = { descricao: values.descricao, categoria: values.categoria || '', observacoes: values.observacoes || '' };
    if (!paid) Object.assign(payload, { valor: parseValor(values.valor), data: values.data, status: values.status });
    try { if (initial.id) await api.updateDespesa(initial.id, payload); else await api.createDespesa(payload); navigation.goBack(); }
    catch (err) { setError(normalizarErro(err)); } finally { setBusy(false); }
  }
  async function excluir() {
    setBusy(true); setError('');
    try { await api.deleteDespesa(initial.id); navigation.goBack(); }
    catch (err) { setError(normalizarErro(err)); } finally { setBusy(false); }
  }
  return <View style={s.panel}>{[['descricao', 'Descrição'], ['categoria', 'Categoria'], ['valor', 'Valor (R$)'], ['data', 'Data (AAAA-MM-DD)'], ['observacoes', 'Observações']].map(([name, label]) => <Input key={name} label={label} value={String(values[name] ?? '')} editable={!busy && !(paid && ['valor', 'data'].includes(name))} onChangeText={(value) => setValues((old) => ({ ...old, [name]: value }))} keyboardType={name === 'valor' ? 'decimal-pad' : 'default'} />)}<View style={s.row}>{['PENDENTE', 'PAGA', 'CANCELADA'].map((status) => <FilterChip key={status} label={status} active={values.status === status} onPress={() => { if (!paid && !busy) setValues((old) => ({ ...old, status })); }} />)}</View>{paid ? <Text style={s.note}>Valor, data e status preservados. Somente os dados descritivos podem ser alterados.</Text> : null}{error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}<PrimaryButton title={busy ? 'Salvando...' : 'Salvar despesa'} disabled={busy} onPress={salvar} />{initial.id && !paid ? <SecondaryButton title="Excluir despesa" danger disabled={busy} onPress={() => Alert.alert('Excluir despesa', 'Excluir esta despesa pendente?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: excluir }])} /> : null}</View>;
}
