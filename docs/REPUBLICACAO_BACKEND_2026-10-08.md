# Republicação do backend — 08/10/2026

Os seis primeiros commits foram preservados até `3893101`. As quatro entregas seguintes, originalmente registradas em 03/10/2026 (UTC), foram retiradas da ponta da branch e republicadas separadamente em 08/10, com as datas reais e novas validações. As publicações retomam a implementação original e incluem a correção de dependência identificada hoje. O histórico original foi preservado em backup local.

| Entrega | Commit original | Commit republicado | Subida em São Paulo |
| --- | --- | --- | --- |
| dependências | `1430d2a` | `7976477` | 2026-10-08T13:50:26.244339-03:00 |
| calculadora e renovação | `235998b` | `ad30989` | 2026-10-08T14:20:02.238071-03:00 |
| testes e Docker | `44faaf5` | `76e8a22` | 2026-10-08T14:50:02.163151-03:00 |
| Documentação | `017cf2e` | Este commit | Última etapa, antecipada para 15h10 a pedido do responsável |

A etapa de dependências também atualizou `proxy-addr` para 2.0.8 após o alerta GHSA-jqcg-44mw-7w3h identificado na revalidação. Passaram 84 testes rápidos e 29 MySQL nessa etapa; a calculadora/renovação passou nos quatro cenários próprios. A etapa de testes reexecutou as suítes completas, a cobertura combinada e o runtime Docker com login, pagamentos, relatórios e OCR PDF/imagem/scan em rede interna. O audit de produção terminou sem vulnerabilidades.

As branches `front-teste` e `mobile-teste` conservam suas próprias versões publicadas. O resultado remoto do GitHub Actions ainda precisa ser consultado; os resultados descritos acima são locais. Os links do roteiro de entrega foram atualizados para os hashes republicados.

Cobertura combinada de linhas em 08/10: 91,09%.
