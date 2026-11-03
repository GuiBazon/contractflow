import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, useThemeStyles } from '../theme';
import { TERMOS_E_CONDICOES } from '../content/termos';

function renderInline(texto, styles, keyPrefix) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return partes.map((parte, index) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return (
        <Text key={`${keyPrefix}-${index}`} style={styles.bold}>
          {parte.slice(2, -2)}
        </Text>
      );
    }

    if (parte.startsWith('*') && parte.endsWith('*')) {
      return (
        <Text key={`${keyPrefix}-${index}`} style={styles.italic}>
          {parte.slice(1, -1)}
        </Text>
      );
    }

    return parte;
  });
}

function criarBlocos(markdown) {
  const blocos = [];

  markdown.split(/\r?\n/).forEach((linha) => {
    const texto = linha.trim();

    if (!texto) {
      return;
    }

    if (texto === '---') {
      blocos.push({ tipo: 'divisor' });
      return;
    }

    const titulo = texto.match(/^(#{1,6})\s+(.*)$/);
    if (titulo) {
      blocos.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] });
      return;
    }

    const item = texto.match(/^[-*]\s+(.*)$/);
    if (item) {
      blocos.push({ tipo: 'item', texto: item[1] });
      return;
    }

    const numerado = texto.match(/^(\d+)\.\s+(.*)$/);
    if (numerado) {
      blocos.push({ tipo: 'numerado', numero: numerado[1], texto: numerado[2] });
      return;
    }

    blocos.push({ tipo: 'paragrafo', texto });
  });

  return blocos;
}

export function TermosConteudo() {
  const { styles } = useThemeStyles(createStyles);
  const blocos = useMemo(() => criarBlocos(TERMOS_E_CONDICOES), []);

  return (
    <View>
      {blocos.map((bloco, index) => {
        const chave = `termo-${index}`;

        if (bloco.tipo === 'titulo') {
          const estilo =
            bloco.nivel <= 1
              ? styles.titulo1
              : bloco.nivel === 2
                ? styles.titulo2
                : styles.titulo3;

          return (
            <Text key={chave} style={estilo}>
              {renderInline(bloco.texto, styles, chave)}
            </Text>
          );
        }

        if (bloco.tipo === 'item') {
          return (
            <View key={chave} style={styles.itemRow}>
              <Text style={styles.marcador}>•</Text>
              <Text style={styles.itemTexto}>
                {renderInline(bloco.texto, styles, chave)}
              </Text>
            </View>
          );
        }

        if (bloco.tipo === 'numerado') {
          return (
            <View key={chave} style={styles.itemRow}>
              <Text style={styles.marcador}>{bloco.numero}.</Text>
              <Text style={styles.itemTexto}>
                {renderInline(bloco.texto, styles, chave)}
              </Text>
            </View>
          );
        }

        if (bloco.tipo === 'divisor') {
          return <View key={chave} style={styles.divisor} />;
        }

        return (
          <Text key={chave} style={styles.paragrafo}>
            {renderInline(bloco.texto, styles, chave)}
          </Text>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  titulo1: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  titulo2: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  titulo3: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragrafo: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingRight: spacing.sm,
  },
  marcador: {
    width: 18,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  itemTexto: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  divisor: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  italic: {
    fontStyle: 'italic',
  },
});
