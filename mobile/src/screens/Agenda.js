import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import useDados from '../hooks/useDados';
import { Screen, s } from '../components/SprintUI';
import { FilterChip, SecondaryButton } from '../components';
import { formatCurrency, formatDate, hojeISO } from '../utils/format';
import { colors } from '../theme';

export function Agenda() {
  const navigation = useNavigation();
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [dia, setDia] = useState(hojeISO());
  const [tipo, setTipo] = useState('');
  const [ano, numero] = mes.split('-').map(Number);
  const ultimo = new Date(ano, numero, 0).getDate();
  const query = useDados(useCallback(() => api.calendario({ de: mes + '-01', ate: mes + '-' + ultimo, ...(tipo ? { tipo } : {}) }), [mes, ultimo, tipo]));
  const eventos = query.data?.data || [];
  const celulas = Array(new Date(ano, numero - 1, 1).getDay()).fill(null).concat(Array.from({ length: ultimo }, (_, index) => index + 1));
  function mudar(delta) {
    const d = new Date(ano, numero - 1 + delta, 1);
    const value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    setMes(value); setDia(value + '-01');
  }
  return <Screen title="Calendário" query={query}>
    <View style={s.row}><SecondaryButton title="Mês anterior" onPress={() => mudar(-1)} style={s.flex} /><SecondaryButton title="Próximo mês" onPress={() => mudar(1)} style={s.flex} /></View>
    <View style={s.row}>{[['', 'Todos'], ['VENCIMENTO', 'Vencimentos'], ['PAGAMENTO', 'Pagamentos'], ['DESPESA', 'Despesas'], ['RENOVACAO', 'Términos']].map(([value, label]) => <FilterChip key={value} label={label} active={tipo === value} onPress={() => setTipo(value)} />)}</View>
    <View style={s.panel}><Text style={s.heading}>{new Date(ano, numero - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, index) => <Text key={'week-' + index} style={{ width: '14.285%', textAlign: 'center', color: colors.textSecondary, paddingVertical: 12 }}>{label}</Text>)}{celulas.map((value, index) => { const date = mes + '-' + String(value).padStart(2, '0'); const count = eventos.filter((event) => event.data === date).length; return value ? <TouchableOpacity key={date} accessibilityRole="button" accessibilityLabel={'Dia ' + value + ', ' + count + ' eventos'} onPress={() => setDia(date)} style={{ width: '14.285%', minHeight: 44, padding: 8, alignItems: 'center', borderRadius: 12, backgroundColor: date === dia ? colors.primary : colors.white }}><Text style={{ color: date === dia ? colors.white : colors.textPrimary }}>{value}</Text>{count ? <Text style={{ fontSize: 9, color: date === dia ? colors.white : colors.primary }}>{count}</Text> : null}</TouchableOpacity> : <View key={'empty-' + index} style={{ width: '14.285%' }} />; })}</View></View>
    <Text style={s.heading}>Eventos de {formatDate(dia)}</Text>{eventos.filter((event) => event.data === dia).map((event) => <TouchableOpacity accessibilityRole="button" key={event.id} style={s.panel} onPress={() => event.contrato_id ? navigation.navigate('DetalheContrato', { contratoId: event.contrato_id }) : navigation.navigate('DespesaForm', { despesaId: Number(event.id.split('-')[1]) })}><Text style={s.heading}>{event.titulo}</Text><Text style={s.note}>{event.tipo} · {event.cliente_nome || event.contrato_numero || ''}</Text><Text style={s.text}>{formatCurrency(event.valor)}</Text></TouchableOpacity>)}{!eventos.some((event) => event.data === dia) ? <Text style={s.note}>Nenhum evento neste dia.</Text> : null}<Text style={s.note}>{eventos.length} eventos no mês. Pagas e canceladas não geram vencimentos em aberto.</Text>
  </Screen>;
}
