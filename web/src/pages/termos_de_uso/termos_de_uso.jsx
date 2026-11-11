import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Divider } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const CLAUSULAS = [
  {
    id: "clausula-1",
    numero: 1,
    titulo: "ACEITAÇÃO DOS TERMOS",
    conteudo:
      'Estes Termos e Condições de Uso ("Termos") regulam o acesso e uso da plataforma ContractFlow, desenvolvida e operada por ContractFlow Tecnologia Ltda. ("Empresa"), inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em São Paulo/SP. O uso da plataforma implica aceitação integral e irrevogável destes Termos.',
  },
  {
    id: "clausula-2",
    numero: 2,
    titulo: "DEFINIÇÕES",
    conteudo:
      'Para os fins destes Termos: "Plataforma" refere-se ao software ContractFlow acessível via web e aplicativo móvel; "Usuário" refere-se a qualquer pessoa física ou jurídica que utilize a plataforma; "Conta" refere-se ao perfil cadastrado pelo Usuário; "Dados" refere-se a todas as informações inseridas, processadas ou geradas na plataforma; "IA/OCR" refere-se às ferramentas de inteligência artificial e reconhecimento óptico de caracteres disponibilizadas como recurso de apoio.',
  },
  {
    id: "clausula-3",
    numero: 3,
    titulo: "ELEGIBILIDADE E CADASTRO",
    conteudo:
      "3.1 Para utilizar a plataforma, o Usuário deve: (a) ser pessoa física maior de 18 anos ou pessoa jurídica regularmente constituída; (b) fornecer informações verídicas, completas e atualizadas no cadastro; (c) manter a confidencialidade de suas credenciais de acesso. 3.2 O Usuário é o único responsável por todas as atividades realizadas em sua conta.",
  },
  {
    id: "clausula-4",
    numero: 4,
    titulo: "USO PERMITIDO E PROIBIÇÕES",
    conteudo: "O Usuário pode usar a plataforma para gerenciar contratos, clientes, cobranças e documentos de sua empresa. É expressamente proibido:",
    lista: [
      "Violar leis ou regulamentos aplicáveis",
      "Transmitir vírus, malware ou código malicioso",
      "Tentar acessar sistemas ou dados de outros usuários",
      "Usar a plataforma para fins fraudulentos ou ilegais",
      "Realizar engenharia reversa ou tentativas de decompilação",
      "Revender ou sublicenciar acesso à plataforma sem autorização",
      "Utilizar bots ou sistemas automatizados sem aprovação prévia",
    ],
  },
  {
    id: "clausula-5",
    numero: 5,
    titulo: "FUNCIONALIDADE DE IA E OCR — RECURSO DE APOIO",
    conteudo:
      "5.1 A funcionalidade de leitura automática de contratos por Inteligência Artificial (IA) e Reconhecimento Óptico de Caracteres (OCR) é disponibilizada como um RECURSO DE APOIO, não como serviço de precisão garantida. 5.2 O Usuário reconhece e aceita que: (a) a extração automática de dados pode conter erros, omissões ou imprecisões; (b) é de responsabilidade exclusiva do Usuário revisar, validar e corrigir todos os dados extraídos pela IA antes de qualquer confirmação; (c) a ContractFlow não se responsabiliza por decisões tomadas com base em dados extraídos automaticamente sem revisão humana; (d) todos os campos preenchidos automaticamente permanecem editáveis e devem ser conferidos.",
  },
  {
    id: "clausula-6",
    numero: 6,
    titulo: "REVISÃO HUMANA OBRIGATÓRIA",
    conteudo:
      '6.1 Em conformidade com as boas práticas de uso de IA e com a legislação vigente, a ContractFlow exige que o Usuário realize a revisão humana de todos os dados extraídos automaticamente antes da confirmação e salvamento. 6.2 Ao clicar em "Aprovar e Criar Contrato" ou equivalente, o Usuário declara ter revisado e validado todas as informações apresentadas, assumindo integral responsabilidade pelos dados confirmados.',
  },
  {
    id: "clausula-7",
    numero: 7,
    titulo: "PLANOS E PAGAMENTOS",
    conteudo:
      "7.1 A ContractFlow oferece planos gratuitos e pagos. Os planos pagos são cobrados conforme descrito na página de preços vigente no momento da contratação. 7.2 Os pagamentos são processados por parceiros certificados PCI-DSS. 7.3 Em caso de cancelamento, o acesso permanece ativo até o fim do período pago.",
  },
  {
    id: "clausula-8",
    numero: 8,
    titulo: "POLÍTICA DE REEMBOLSO",
    conteudo:
      "Reembolsos são avaliados caso a caso, mediante solicitação em até 7 dias corridos após a cobrança, para planos mensais, e até 30 dias para planos anuais. Não são elegíveis a reembolso: período já utilizado, complementos avulsos, e planos com desconto especial.",
  },
  {
    id: "clausula-9",
    numero: 9,
    titulo: "PROPRIEDADE INTELECTUAL",
    conteudo:
      "9.1 Todo o conteúdo da plataforma (código, design, marca, algoritmos, documentação) é propriedade exclusiva da ContractFlow ou de seus licenciadores. 9.2 O Usuário não adquire nenhum direito sobre a propriedade intelectual da plataforma pelo simples uso da mesma. 9.3 O Usuário concede à ContractFlow licença limitada para processar seus Dados exclusivamente para a prestação dos serviços contratados.",
  },
  {
    id: "clausula-10",
    numero: 10,
    titulo: "CONFIDENCIALIDADE E SIGILO",
    conteudo:
      "Ambas as partes comprometem-se a manter em sigilo absoluto todas as informações confidenciais trocadas no âmbito desta relação, não as divulgando a terceiros sem consentimento prévio e por escrito, exceto quando exigido por lei ou ordem judicial.",
  },
  {
    id: "clausula-11",
    numero: 11,
    titulo: "DISPONIBILIDADE E SUPORTE",
    conteudo:
      "11.1 A ContractFlow emprega esforços razoáveis para manter a plataforma disponível 24/7, com SLA de 99,5% de uptime mensal. 11.2 Manutenções programadas serão comunicadas com antecedência mínima de 48 horas. 11.3 O suporte técnico está disponível via e-mail e chat nos planos pagos.",
  },
  {
    id: "clausula-12",
    numero: 12,
    titulo: "LIMITAÇÃO DE RESPONSABILIDADE",
    conteudo:
      "12.1 A ContractFlow não se responsabiliza por: (a) danos indiretos, incidentais ou consequenciais; (b) perda de dados por falha do Usuário em realizar backups; (c) erros em dados inseridos ou confirmados pelo Usuário; (d) uso inadequado das funcionalidades de IA/OCR sem revisão humana; (e) interrupções causadas por força maior ou falhas de terceiros.",
  },
  {
    id: "clausula-13",
    numero: 13,
    titulo: "PROTEÇÃO DE DADOS PESSOAIS (LGPD)",
    conteudo:
      "13.1 A ContractFlow é operadora de dados nos termos da Lei 13.709/2018 (LGPD). Os dados dos clientes do Usuário inseridos na plataforma são de responsabilidade do Usuário (controlador). 13.2 Os titulares de dados têm direito a: confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação e revogação de consentimento. 13.3 Solicitações de titulares devem ser encaminhadas ao DPO da ContractFlow: dpo@contractflow.com.br.",
  },
  {
    id: "clausula-14",
    numero: 14,
    titulo: "COOKIES E RASTREAMENTO",
    conteudo:
      "A plataforma utiliza cookies essenciais para funcionamento, cookies de sessão para autenticação e, mediante consentimento, cookies analíticos para melhoria do serviço. O Usuário pode gerenciar preferências de cookies nas configurações do navegador.",
  },
  {
    id: "clausula-15",
    numero: 15,
    titulo: "SEGURANÇA DA INFORMAÇÃO",
    conteudo:
      "15.1 A ContractFlow adota medidas técnicas e organizacionais de segurança, incluindo: criptografia em trânsito (TLS 1.3), criptografia em repouso (AES-256), autenticação multifator disponível, logs de auditoria e backups automatizados. 15.2 O Usuário é responsável por manter a segurança de suas credenciais e por comunicar imediatamente qualquer suspeita de acesso não autorizado.",
  },
  {
    id: "clausula-16",
    numero: 16,
    titulo: "COMUNICAÇÕES E NOTIFICAÇÕES",
    conteudo:
      "A ContractFlow poderá enviar comunicações por e-mail, notificações push e SMS para: alertas de vencimento, confirmações de operações, atualizações de termos e comunicados de serviço. O Usuário pode gerenciar preferências de comunicação nas configurações de alertas.",
  },
  {
    id: "clausula-17",
    numero: 17,
    titulo: "ALTERAÇÕES NA PLATAFORMA",
    conteudo:
      "A ContractFlow reserva-se o direito de modificar, suspender ou descontinuar funcionalidades da plataforma mediante aviso prévio razoável, salvo em casos de emergência de segurança ou determinação legal.",
  },
  {
    id: "clausula-18",
    numero: 18,
    titulo: "ALTERAÇÕES NESTES TERMOS",
    conteudo:
      "18.1 Estes Termos podem ser alterados a qualquer momento pela ContractFlow. Alterações materiais serão comunicadas com antecedência mínima de 15 dias por e-mail e notificação na plataforma. 18.2 O uso continuado da plataforma após a data de vigência das alterações constitui aceitação dos novos termos.",
  },
  {
    id: "clausula-19",
    numero: 19,
    titulo: "RESCISÃO",
    conteudo:
      "19.1 O Usuário pode encerrar sua conta a qualquer momento através das configurações de perfil. 19.2 A ContractFlow pode suspender ou encerrar contas que violem estes Termos, mediante notificação prévia exceto em casos de violação grave ou fraude.",
  },
  {
    id: "clausula-20",
    numero: 20,
    titulo: "EXPORTAÇÃO DE DADOS",
    conteudo:
      "Ao encerrar a conta, o Usuário tem direito de exportar seus dados (contratos, clientes, relatórios) em formato estruturado (CSV/JSON) por um período de 30 dias após o encerramento. Após esse prazo, os dados serão permanentemente excluídos.",
  },
  {
    id: "clausula-21",
    numero: 21,
    titulo: "INTEGRAÇÕES DE TERCEIROS",
    conteudo:
      "A plataforma pode oferecer integrações com serviços de terceiros (gateways de pagamento, serviços de e-mail, ERPs). A ContractFlow não se responsabiliza pelo funcionamento, disponibilidade ou políticas de privacidade desses terceiros.",
  },
  {
    id: "clausula-22",
    numero: 22,
    titulo: "FORO E LEI APLICÁVEL",
    conteudo:
      "Estes Termos são regidos pelas leis da República Federativa do Brasil. As partes elegem o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes destes Termos, renunciando a qualquer outro, por mais privilegiado que seja.",
  },
  {
    id: "clausula-23",
    numero: 23,
    titulo: "DISPOSIÇÕES GERAIS",
    conteudo:
      "23.1 A tolerância ao descumprimento de qualquer disposição destes Termos não implica novação ou renúncia ao direito de exigi-la posteriormente. 23.2 Se qualquer disposição for considerada inválida, as demais permanecerão em pleno vigor.",
  },
  {
    id: "clausula-24",
    numero: 24,
    titulo: "CONTATO E CANAL DE DENÚNCIAS",
    conteudo:
      "Para dúvidas, reclamações ou denúncias: E-mail geral: contato@contractflow.com.br | Suporte: suporte@contractflow.com.br | DPO/Privacidade: dpo@contractflow.com.br | Endereço: Av. Paulista, 1000 - São Paulo/SP - CEP 01310-100.",
  },
  {
    id: "clausula-25",
    numero: 25,
    titulo: "DECLARAÇÃO DE ACEITE DIGITAL",
    conteudo:
      "Ao criar uma conta ou utilizar a plataforma ContractFlow, o Usuário declara expressamente que: leu integralmente estes Termos e Condições de Uso; compreende que a funcionalidade de IA/OCR é um recurso de apoio que requer revisão humana obrigatória; concorda com a Política de Privacidade e com o tratamento de dados nos termos da LGPD; tem capacidade legal para celebrar este acordo.",
  },
];

const NAV_GROUPS = [
  { label: "Aceitação e Elegibilidade", ids: ["clausula-1", "clausula-2", "clausula-3"] },
  { label: "Uso da Plataforma", ids: ["clausula-4", "clausula-5", "clausula-6"] },
  { label: "Planos e Pagamentos", ids: ["clausula-7", "clausula-8"] },
  { label: "Propriedade e Dados", ids: ["clausula-9", "clausula-10", "clausula-11"] },
  { label: "Responsabilidades", ids: ["clausula-12", "clausula-13", "clausula-14", "clausula-15"] },
  { label: "Comunicações e Mudanças", ids: ["clausula-16", "clausula-17", "clausula-18"] },
  { label: "Encerramento", ids: ["clausula-19", "clausula-20", "clausula-21"] },
  { label: "Disposições Legais", ids: ["clausula-22", "clausula-23", "clausula-24", "clausula-25"] },
];

function TermosDeUso() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("clausula-1");
  const observerRef = useRef(null);

  useEffect(() => {
    const sections = document.querySelectorAll("section[id^='clausula-']");

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((s) => observerRef.current.observe(s));

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function getActiveGroup(id) {
    return NAV_GROUPS.find((g) => g.ids.includes(id));
  }

  const activeGroup = getActiveGroup(activeSection);

  return (
    <Box sx={{ bgcolor: "#f7f9fc", minHeight: "100dvh", fontFamily: "Roboto, sans-serif" }}>
      {/* Container principal */}
      <Box
        sx={{
          maxWidth: "1100px",
          mx: "auto",
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 4, md: 6 },
          display: "flex",
          gap: 5,
          alignItems: "flex-start",
        }}
      >
        {/* ── Sidebar navegação (somente desktop lg+) ── */}
        <Box
          component="nav"
          aria-label="Navegação dos termos"
          sx={{
            display: { xs: "none", lg: "block" },
            width: 220,
            minWidth: 220,
            position: "sticky",
            top: 32,
            alignSelf: "flex-start",
          }}
        >
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              mb: 1.5,
            }}
          >
            Nesta página
          </Typography>

          {NAV_GROUPS.map((group) => {
            const isGroupActive = activeGroup?.label === group.label;
            return (
              <Box key={group.label} sx={{ mb: 0.5 }}>
                <Box
                  onClick={() => scrollTo(group.ids[0])}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    px: 1,
                    py: 0.75,
                    borderRadius: "7px",
                    cursor: "pointer",
                    bgcolor: isGroupActive ? "#eff6ff" : "transparent",
                    transition: "all 0.15s",
                    "&:hover": { bgcolor: "#f1f5f9" },
                  }}
                >
                  <Box
                    sx={{
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      bgcolor: isGroupActive ? "#2563eb" : "#cbd5e1",
                      flexShrink: 0,
                      transition: "background 0.15s",
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "12.5px",
                      fontWeight: isGroupActive ? 600 : 400,
                      color: isGroupActive ? "#2563eb" : "#64748b",
                      lineHeight: 1.4,
                      transition: "color 0.15s",
                    }}
                  >
                    {group.label}
                  </Typography>
                </Box>
              </Box>
            );
          })}

          <Divider sx={{ my: 2 }} />

          <Box
            onClick={() => navigate("/register")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              px: 1,
              py: 0.75,
              borderRadius: "7px",
              cursor: "pointer",
              color: "#64748b",
              "&:hover": { bgcolor: "#f1f5f9", color: "#2563eb" },
              transition: "all 0.15s",
            }}
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: "12.5px", fontWeight: 500 }}>
              Voltar ao Cadastro
            </Typography>
          </Box>
        </Box>

        {/* ── Artigo principal ── */}
        <Box
          component="article"
          sx={{
            flex: 1,
            maxWidth: "800px",
            lineHeight: 1.7,
          }}
        >
          {/* Botão voltar (mobile / topo) */}
          <Box
            onClick={() => navigate("/register")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.8,
              mb: 3,
              px: 1.5,
              py: 0.8,
              borderRadius: "8px",
              bgcolor: "#fff",
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              color: "#2563eb",
              fontSize: "13px",
              fontWeight: 500,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              "&:hover": { bgcolor: "#eff6ff" },
              transition: "background 0.15s",
            }}
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
            Retornar ao Cadastro
          </Box>

          {/* Cabeçalho */}
          <Box sx={{ mb: 4 }}>
            {/* Logo / Marca */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "9px",
                  background: "linear-gradient(145deg, #203f82 0%, #294e9d 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LinkRoundedIcon sx={{ color: "#fff", fontSize: 18 }} />
              </Box>
              <Typography sx={{ fontSize: "17px", fontWeight: 700, color: "#182338" }}>
                ContractFlow
              </Typography>
            </Box>

            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "20px", sm: "24px" },
                fontWeight: 800,
                color: "#182338",
                letterSpacing: "-0.3px",
                mb: 1,
              }}
            >
              TERMOS E CONDIÇÕES DE USO
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 500 }}>
                Versão 2.1
              </Typography>
              <Typography sx={{ fontSize: "12.5px", color: "#94a3b8" }}>·</Typography>
              <Typography sx={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 500 }}>
                Última atualização: 10 de novembro de 2026
              </Typography>
            </Box>
          </Box>

          {/* Alerta IMPORTANTE */}
          <Box
            sx={{
              bgcolor: "#fef9c3",
              border: "1px solid #fde68a",
              borderRadius: "12px",
              p: 2.5,
              mb: 4,
              display: "flex",
              gap: 1.5,
              alignItems: "flex-start",
            }}
          >
            <WarningAmberRoundedIcon
              sx={{ color: "#d97706", fontSize: 20, mt: 0.1, flexShrink: 0 }}
            />
            <Box>
              <Typography
                sx={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#92400e",
                  mb: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Importante
              </Typography>
              <Typography sx={{ fontSize: "13.5px", color: "#78350f", lineHeight: 1.65 }}>
                Leia atentamente este documento antes de utilizar a plataforma ContractFlow. Ao criar
                uma conta ou utilizar qualquer funcionalidade da plataforma, você declara ter lido,
                compreendido e concordado integralmente com estes Termos. Caso não concorde com
                qualquer disposição, não utilize a plataforma.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Cláusulas */}
          {CLAUSULAS.map((clausula) => (
            <Box
              component="section"
              id={clausula.id}
              key={clausula.id}
              sx={{ scrollMarginTop: "24px" }}
            >
              <Typography
                component="h2"
                sx={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#182338",
                  mt: 4,
                  mb: 1,
                  letterSpacing: "0.01em",
                }}
              >
                {clausula.numero}. {clausula.titulo}
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: "14px", sm: "14.5px" },
                  color: "#374151",
                  lineHeight: 1.75,
                }}
              >
                {clausula.conteudo}
              </Typography>

              {clausula.lista && (
                <Box
                  component="ul"
                  sx={{ mt: 1.5, pl: 2.5, mb: 0 }}
                >
                  {clausula.lista.map((item, idx) => (
                    <Box
                      component="li"
                      key={idx}
                      sx={{
                        fontSize: { xs: "14px", sm: "14.5px" },
                        color: "#374151",
                        mb: 0.5,
                        lineHeight: 1.7,
                      }}
                    >
                      {item}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ))}

          <Divider sx={{ mt: 5, mb: 3 }} />

          {/* Rodapé / Botão voltar */}
          <Box sx={{ display: "flex", justifyContent: "center", pb: 2 }}>
            <Box
              onClick={() => navigate("/register")}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.8,
                px: 2.5,
                py: 1.2,
                borderRadius: "8px",
                bgcolor: "#2563eb",
                cursor: "pointer",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
                "&:hover": { bgcolor: "#1d4ed8" },
                transition: "background 0.15s",
              }}
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
              Retornar ao Cadastro
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default TermosDeUso;
