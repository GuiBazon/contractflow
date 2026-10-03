import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import useDados from '../hooks/useDados';
import { Screen, Metrics, Pager, s } from '../components/SprintUI';
import { FilterChip, PrimaryButton } from '../components';
import { formatCurrency, formatDate } from '../utils/format';

export function Financeiro() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('recebiveis');
  const [page, setPage] = useState(1);
  const loader = useCallback(() => Promise.all([api.dashboard(), tab === 'recebiveis' ? api.listRecebiveis({ page, limit: 20 }) : tab === 'receitas' ? api.listReceitas({ page, limit: 20 }) : api.listDespesas({ page, limit: 20 })]), [tab, page]);
  const query = useDados(loader);
  const summary = query.data?.[0] || {};
  const rows = query.data?.[1];
  return <Screen title="Financeiro" query={query}>
    <Metrics items={[{ label: 'A receber', value: summary.pendente }, { label: 'Recebido', value: summary.recebido, green: true }, { label: 'Despesas pagas', value: summary.despesas_pagas, danger: true }, { label: 'Saldo projetado', value: summary.saldo_projetado }]} />
    <View style={s.row}>{[['recebiveis', 'Recebíveis'], ['receitas', 'Receitas'], ['despesas', 'Despesas']].map(([value, label]) => <FilterChip key={value} label={label} active={value === tab} onPress={() => { setTab(value); setPage(1); }} />)}</View>
    {tab === 'despesas' ? <PrimaryButton title="Nova despesa" onPress={() => navigation.navigate('DespesaForm')} /> : null}
    {(rows?.data || []).map((row) => <TouchableOpacity key={row.id} accessibilityRole="button" style={s.panel} onPress={() => tab === 'despesas' ? navigation.navigate('DespesaForm', { despesa: row }) : navigation.navigate('DetalheContrato', { contratoId: row.contrato_id })}>
      <Text style={s.heading}>{row.descricao || row.cliente_nome}</Text><Text style={s.note}>{row.contrato_numero || row.categoria || ''}{row.numero ? ' · Parcela ' + row.numero : ''}</Text><Text style={s.text}>{formatCurrency(tab === 'recebiveis' ? row.pendente : row.valor)}</Text><Text style={s.note}>{formatDate(row.data_vencimento || row.data_pagamento || row.data)} · {row.situacao || row.status || 'Receita registrada'}</Text>{tab === 'recebiveis' && (row.juros || row.multa) ? <Text style={s.note}>Juros estimados {formatCurrency(row.juros)} · Multa estimada {formatCurrency(row.multa)}</Text> : null}
    </TouchableOpacity>)}{!rows?.data?.length ? <Text style={s.note}>Nenhum registro encontrado.</Text> : null}
    <Pager paginacao={rows?.paginacao} onPage={setPage} /><Text style={s.note}>Os totais consideram todos os registros. Pagamentos registram o principal; juros e multa são estimativas.</Text>
  </Screen>;
}
