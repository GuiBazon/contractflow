import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import useDados from '../hooks/useDados';
import { Screen, Metrics, s } from '../components/SprintUI';
import { PrimaryButton, SecondaryButton } from '../components';
import { formatCurrency, formatDate } from '../utils/format';
import { colors } from '../theme';

export function Dashboard() {
  const navigation = useNavigation();
  const query = useDados(useCallback(() => Promise.all([api.dashboard(), api.me()]), []));
  const data = query.data?.[0] || {};
  const usuario = query.data?.[1]?.usuario;
  const fluxo = data.fluxo_mensal?.slice(-6) || [];
  const max = Math.max(...fluxo.map((row) => Number(row.receitas)), ...fluxo.map((row) => Number(row.despesas)), 1);
  return <Screen title="ContractFlow" query={query}>
    <View><Text style={s.title}>Olá, {usuario?.nome?.split(' ')[0]}!</Text><Text style={s.note}>Acompanhe seus contratos e o fluxo financeiro.</Text></View>
    <Metrics items={[{ label: 'A receber', value: data.pendente }, { label: 'Recebido', value: data.recebido, green: true }, { label: 'Em atraso', value: data.atrasado, danger: true }, { label: 'Saldo projetado', value: data.saldo_projetado }]} />
    <View style={s.row}><PrimaryButton title="Novo contrato" onPress={() => navigation.navigate('FormContrato')} style={s.flex} /><SecondaryButton title="Importar contrato" onPress={() => navigation.navigate('ImportarContrato')} style={s.flex} /></View>
    <View style={s.panel}><Text style={s.heading}>Resumo do negócio</Text><Text style={s.text}>{data.clientes} clientes · {data.contratos_ativos} contratos ativos</Text><Text style={s.note}>Despesas pagas: {formatCurrency(data.despesas_pagas || 0)}</Text><Text style={s.note}>Despesas pendentes: {formatCurrency(data.despesas_pendentes || 0)}</Text><Text style={s.note}>Saldo realizado: {formatCurrency(data.saldo_realizado || 0)}</Text><Text style={s.note}>Saldos dos registros do sistema, sem saldo bancário inicial.</Text></View>
    <View style={s.panel}><Text style={s.heading}>Próximos vencimentos</Text>{data.proximos_vencimentos?.length ? data.proximos_vencimentos.slice(0, 4).map((row) => <TouchableOpacity accessibilityRole="button" key={row.id} onPress={() => navigation.navigate('DetalheContrato', { contratoId: row.contrato_id })} style={{ paddingVertical: 8 }}><Text style={s.text}>{row.cliente_nome}</Text><Text style={s.note}>{row.contrato_numero} · Parcela {row.numero} · {formatDate(row.data_vencimento)}</Text><Text style={[s.heading, { color: colors.primary }]}>{formatCurrency(row.pendente)}</Text></TouchableOpacity>) : <Text style={s.note}>Nenhum vencimento próximo.</Text>}<SecondaryButton title="Ver recebíveis" onPress={() => navigation.navigate('Financeiro')} /></View>
    <View style={s.panel}><Text style={s.heading}>Fluxo mensal</Text><Text style={s.note}>Receitas em azul · Despesas em laranja</Text>{fluxo.length ? fluxo.map((row) => <View key={row.mes} style={{ gap: 6 }}><Text style={s.note}>{row.mes} · {formatCurrency(row.receitas)} / {formatCurrency(row.despesas)}</Text><View style={{ height: 8, width: String(Number(row.receitas) / max * 100) + '%', backgroundColor: colors.primary, borderRadius: 3 }} /><View style={{ height: 8, width: String(Number(row.despesas) / max * 100) + '%', backgroundColor: '#f97316', borderRadius: 3 }} /></View>) : <Text style={s.note}>Nenhuma movimentação financeira registrada.</Text>}</View>
  </Screen>;
}
