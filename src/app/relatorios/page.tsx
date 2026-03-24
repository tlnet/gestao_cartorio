"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useProtocolos, useUsuarios } from "@/hooks/use-supabase";
import { useServicos } from "@/hooks/use-servicos";
import { useStatusPersonalizados } from "@/hooks/use-status-personalizados";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  CalendarIcon,
  Download,
  Filter,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  FileText,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StaggeredCards, FadeInUp } from "@/components/ui/page-transition";

const Relatorios = () => {
  const { userProfile, userType } = useAuth();

  const scopedCartorioId =
    userType === "admin_geral"
      ? undefined
      : (userProfile as any)?.cartorio_id ?? undefined;

  const { protocolos, loading: protocolosLoading } = useProtocolos(scopedCartorioId);
  const { usuarios, loading: usuariosLoading } = useUsuarios(scopedCartorioId);
  const { servicos, loading: servicosLoading } = useServicos();
  const { statusPersonalizados, loading: statusLoading } =
    useStatusPersonalizados();

  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroServico, setFiltroServico] = useState("todos");
  const [metricas, setMetricas] = useState({
    totalProtocolos: 0,
    protocolosConcluidos: 0,
    protocolosAndamento: 0,
    tempoMedioProcessamento: 0,
    taxaConclusao: 0,
  });
  const [dadosTempoReal, setDadosTempoReal] = useState<any[]>([]);
  const [distribuicaoServicos, setDistribuicaoServicos] = useState<any[]>([]);
  const [performanceUsuarios, setPerformanceUsuarios] = useState<any[]>([]);
  const [tempoProcessamento, setTempoProcessamento] = useState<any[]>([]);
  const [relatorioGerado, setRelatorioGerado] = useState(false);
  const [protocolosFiltrados, setProtocolosFiltrados] = useState<any[]>([]);
  const [analiseCompleta, setAnaliseCompleta] = useState<any>(null);

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    let protocolosFiltrados = [...protocolos];

    // Filtro por data
    if (dataInicio) {
      protocolosFiltrados = protocolosFiltrados.filter((p) => {
        const dataProtocolo = new Date(p.created_at);
        return dataProtocolo >= dataInicio;
      });
    }

    if (dataFim) {
      protocolosFiltrados = protocolosFiltrados.filter((p) => {
        const dataProtocolo = new Date(p.created_at);
        return dataProtocolo <= dataFim;
      });
    }

    // Filtro por status
    if (filtroStatus !== "todos") {
      protocolosFiltrados = protocolosFiltrados.filter((p) => {
        if (filtroStatus === "concluido") return p.status === "Concluído";
        if (filtroStatus === "andamento") return p.status === "Em Andamento";
        if (filtroStatus === "aguardando")
          return p.status === "Aguardando Análise";
        if (filtroStatus === "pendente") return p.status === "Pendente";
        return p.status === filtroStatus;
      });
    }

    // Filtro por serviço
    if (filtroServico !== "todos") {
      protocolosFiltrados = protocolosFiltrados.filter((p) => {
        if (Array.isArray(p.servicos)) {
          return p.servicos.some((servico: string) =>
            servico.toLowerCase().includes(filtroServico.toLowerCase())
          );
        }
        return p.servicos?.toLowerCase().includes(filtroServico.toLowerCase());
      });
    }

    setProtocolosFiltrados(protocolosFiltrados);
    return protocolosFiltrados;
  };

  // Função para calcular métricas
  const calcularMetricas = (protocolosParaCalcular = protocolos) => {
    if (!protocolosParaCalcular.length) return;

    const totalProtocolos = protocolosParaCalcular.length;
    const protocolosConcluidos = protocolosParaCalcular.filter(
      (p) => p.status === "Concluído"
    ).length;
    const protocolosAndamento = protocolosParaCalcular.filter(
      (p) => p.status === "Em Andamento"
    ).length;
    const taxaConclusao =
      totalProtocolos > 0 ? (protocolosConcluidos / totalProtocolos) * 100 : 0;

    // Calcular tempo médio de processamento
    const protocolosComPrazo = protocolosParaCalcular.filter(
      (p) => p.prazo_execucao && p.status === "Concluído"
    );
    const tempoMedio =
      protocolosComPrazo.length > 0
        ? protocolosComPrazo.reduce((acc, p) => {
            const dataAbertura = new Date(p.created_at);
            const dataConclusao = new Date(p.prazo_execucao);
            const diffTime = Math.abs(
              dataConclusao.getTime() - dataAbertura.getTime()
            );
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return acc + diffDays;
          }, 0) / protocolosComPrazo.length
        : 0;

    setMetricas({
      totalProtocolos,
      protocolosConcluidos,
      protocolosAndamento,
      tempoMedioProcessamento: Math.round(tempoMedio * 10) / 10,
      taxaConclusao: Math.round(taxaConclusao * 10) / 10,
    });
  };

  // Função para calcular dados temporais
  const calcularDadosTemporais = () => {
    if (!protocolos.length) return;

    // Debug: verificar dados dos protocolos
    // console.log("Protocolos para análise temporal:", protocolos.map(p => ({
    //   id: p.id,
    //   status: p.status,
    //   created_at: p.created_at,
    //   mes: new Date(p.created_at).getMonth()
    // })));

    const meses = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const dados = meses.map((mes, index) => {
      const protocolosMes = protocolos.filter((p) => {
        const dataProtocolo = new Date(p.created_at);
        return dataProtocolo.getMonth() === index;
      });

      const concluidosMes = protocolosMes.filter(
        (p) => p.status === "Concluído"
      ).length;

      const emAndamentoMes = protocolosMes.filter(
        (p) => p.status === "Em Andamento"
      ).length;

      const dadosMes = {
        mes,
        abertos: emAndamentoMes, // Corrigido: usar "abertos" para protocolos em andamento
        concluidos: concluidosMes,
      };

      // Debug para setembro (mês 8)
      // if (index === 8) {
      //   console.log(`Dados para ${mes}:`, {
      //     totalProtocolos: protocolosMes.length,
      //     concluidos: concluidosMes,
      //     emAndamento: emAndamentoMes,
      //     protocolos: protocolosMes.map(p => ({ id: p.id, status: p.status }))
      //   });
      // }

      return dadosMes;
    });

    // console.log("Dados temporais calculados:", dados);
    setDadosTempoReal(dados);
  };

  // Função para calcular distribuição por serviços
  const calcularDistribuicaoServicos = () => {
    if (!protocolos.length) return;

    const servicosMap = new Map();
    const cores = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    // Debug: verificar dados dos protocolos
    // console.log("Protocolos para análise de serviços:", protocolos.map(p => ({
    //   id: p.id,
    //   status: p.status,
    //   servicos: p.servicos
    // })));

    protocolos.forEach((protocolo) => {
      if (Array.isArray(protocolo.servicos)) {
        protocolo.servicos.forEach((servico: string) => {
          servicosMap.set(servico, (servicosMap.get(servico) || 0) + 1);
        });
      } else if (protocolo.servicos) {
        servicosMap.set(
          protocolo.servicos,
          (servicosMap.get(protocolo.servicos) || 0) + 1
        );
      }
    });

    const distribuicao = Array.from(servicosMap.entries()).map(
      ([servico, quantidade], index) => ({
        servico,
        quantidade,
        cor: cores[index % cores.length],
      })
    );

    // console.log("Distribuição de serviços calculada:", distribuicao);
    setDistribuicaoServicos(distribuicao);
  };

  // Função para calcular performance dos usuários
  const calcularPerformanceUsuarios = () => {
    if (!protocolos.length || !usuarios.length) return;

    const performance = usuarios
      .map((usuario) => {
        const protocolosUsuario = protocolos.filter(
          (p) => p.criado_por === usuario.id
        );
        const protocolosConcluidos = protocolosUsuario.filter(
          (p) => p.status === "Concluído"
        ).length;
        const taxa =
          protocolosUsuario.length > 0
            ? (protocolosConcluidos / protocolosUsuario.length) * 100
            : 0;

        return {
          usuario: usuario.name || usuario.email,
          protocolos: protocolosUsuario.length,
          concluidos: protocolosConcluidos,
          taxa: Math.round(taxa * 10) / 10,
        };
      })
      .filter((p) => p.protocolos > 0)
      .sort((a, b) => b.taxa - a.taxa);

    setPerformanceUsuarios(performance);
  };

  // Função para calcular tempo de processamento por dia da semana
  const calcularTempoProcessamento = () => {
    if (!protocolos.length) return;

    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dados = dias.map((dia, index) => {
      const protocolosDia = protocolos.filter((p) => {
        const dataProtocolo = new Date(p.created_at);
        return dataProtocolo.getDay() === index;
      });

      const protocolosComPrazo = protocolosDia.filter(
        (p) => p.prazo_execucao && p.status === "Concluído"
      );
      const tempoMedio =
        protocolosComPrazo.length > 0
          ? protocolosComPrazo.reduce((acc, p) => {
              const dataAbertura = new Date(p.created_at);
              const dataConclusao = new Date(p.prazo_execucao);
              const diffTime = Math.abs(
                dataConclusao.getTime() - dataAbertura.getTime()
              );
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return acc + diffDays;
            }, 0) / protocolosComPrazo.length
          : 0;

      return {
        dia,
        tempo: Math.round(tempoMedio * 10) / 10,
      };
    });

    setTempoProcessamento(dados);
  };

  // useEffect para calcular dados quando protocolos ou usuários mudarem
  useEffect(() => {
    if (!protocolosLoading && !usuariosLoading) {
      calcularMetricas();
      calcularDadosTemporais();
      calcularDistribuicaoServicos();
      calcularPerformanceUsuarios();
      calcularTempoProcessamento();
    }
  }, [protocolos, usuarios, protocolosLoading, usuariosLoading]);

  const statusOptions = [
    { value: "todos", label: "Todos os Status" },
    ...statusPersonalizados.map((status) => ({
      value: status.nome,
      label: status.nome,
    })),
  ];

  const servicoOptions = [
    { value: "todos", label: "Todos os Serviços" },
    ...servicos.map((servico) => ({
      value: servico.nome,
      label: servico.nome,
    })),
  ];

  // Função para gerar análise completa do cartório
  const gerarAnaliseCompleta = (protocolosParaAnalise: any[]) => {
    const protocolosConcluidos = protocolosParaAnalise.filter(
      (p) => p.status === "Concluído"
    );
    const protocolosEmAndamento = protocolosParaAnalise.filter(
      (p) => p.status === "Em Andamento"
    );
    const protocolosAguardando = protocolosParaAnalise.filter(
      (p) => p.status === "Aguardando Análise"
    );
    const protocolosPendentes = protocolosParaAnalise.filter(
      (p) => p.status === "Pendente"
    );

    // Análise de Tempo de Processamento
    const temposProcessamento = protocolosConcluidos
      .map((p) => {
        if (p.data_conclusao) {
          const dataAbertura = new Date(p.created_at);
          const dataConclusao = new Date(p.data_conclusao);
          return Math.ceil(
            (dataConclusao.getTime() - dataAbertura.getTime()) /
              (1000 * 60 * 60 * 24)
          );
        }
        return null;
      })
      .filter((t) => t !== null);

    const tempoMedioProcessamento =
      temposProcessamento.length > 0
        ? Math.round(
            temposProcessamento.reduce((a, b) => a + b, 0) /
              temposProcessamento.length
          )
        : 0;

    const tempoMinimoProcessamento =
      temposProcessamento.length > 0 ? Math.min(...temposProcessamento) : 0;
    const tempoMaximoProcessamento =
      temposProcessamento.length > 0 ? Math.max(...temposProcessamento) : 0;

    // Análise de Serviços
    const todosServicos: string[] = [];
    protocolosParaAnalise.forEach((p) => {
      if (Array.isArray(p.servicos)) {
        todosServicos.push(...p.servicos);
      } else if (p.servicos) {
        todosServicos.push(p.servicos);
      }
    });

    const servicosContagem = todosServicos.reduce(
      (acc: any, servico: string) => {
        acc[servico] = (acc[servico] || 0) + 1;
        return acc;
      },
      {}
    );

    const servicosMaisDemandados = Object.entries(servicosContagem)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([servico, count]) => ({ servico, count }));

    // Análise de Performance por Período
    const protocolosPorMes = protocolosParaAnalise.reduce((acc: any, p) => {
      const mes = new Date(p.created_at).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      if (!acc[mes]) {
        acc[mes] = { total: 0, concluidos: 0, emAndamento: 0 };
      }
      acc[mes].total++;
      if (p.status === "Concluído") acc[mes].concluidos++;
      if (p.status === "Em Andamento") acc[mes].emAndamento++;
      return acc;
    }, {});

    const performancePorMes = Object.entries(protocolosPorMes).map(
      ([mes, dados]: [string, any]) => ({
        mes,
        total: dados.total,
        concluidos: dados.concluidos,
        emAndamento: dados.emAndamento,
        taxaConclusao:
          dados.total > 0
            ? Math.round((dados.concluidos / dados.total) * 100)
            : 0,
      })
    );

    // Análise de Prazo vs Realidade
    const protocolosComPrazo = protocolosConcluidos.filter(
      (p) => p.prazo_execucao
    );
    const protocolosNoPrazo = protocolosComPrazo.filter((p) => {
      const prazo = new Date(p.prazo_execucao);
      const conclusao = new Date(p.data_conclusao);
      return conclusao <= prazo;
    });

    const taxaCumprimentoPrazo =
      protocolosComPrazo.length > 0
        ? Math.round(
            (protocolosNoPrazo.length / protocolosComPrazo.length) * 100
          )
        : 0;

    // Análise de Tendências
    const ultimos30Dias = protocolosParaAnalise.filter((p) => {
      const dataProtocolo = new Date(p.created_at);
      const hoje = new Date();
      const diffTime = hoje.getTime() - dataProtocolo.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    });

    const protocolosConcluidos30Dias = ultimos30Dias.filter(
      (p) => p.status === "Concluído"
    );
    const tendenciaConclusao =
      ultimos30Dias.length > 0
        ? Math.round(
            (protocolosConcluidos30Dias.length / ultimos30Dias.length) * 100
          )
        : 0;

    return {
      resumo: {
        totalProtocolos: protocolosParaAnalise.length,
        protocolosConcluidos: protocolosConcluidos.length,
        protocolosEmAndamento: protocolosEmAndamento.length,
        protocolosAguardando: protocolosAguardando.length,
        protocolosPendentes: protocolosPendentes.length,
        taxaConclusao:
          protocolosParaAnalise.length > 0
            ? Math.round(
                (protocolosConcluidos.length / protocolosParaAnalise.length) *
                  100
              )
            : 0,
      },
      tempoProcessamento: {
        tempoMedio: tempoMedioProcessamento,
        tempoMinimo: tempoMinimoProcessamento,
        tempoMaximo: tempoMaximoProcessamento,
        totalAnalisados: temposProcessamento.length,
      },
      servicos: {
        maisDemandados: servicosMaisDemandados,
        totalServicosUnicos: Object.keys(servicosContagem).length,
        totalServicosRealizados: todosServicos.length,
      },
      performance: {
        porMes: performancePorMes,
        taxaCumprimentoPrazo,
        tendenciaConclusao30Dias: tendenciaConclusao,
      },
      insights: {
        protocolosNoPrazo: protocolosNoPrazo.length,
        protocolosAtrasados:
          protocolosComPrazo.length - protocolosNoPrazo.length,
        servicoMaisPopular: servicosMaisDemandados[0]?.servico || "N/A",
        mesMaisProdutivo: performancePorMes.reduce(
          (max, mes) => (mes.total > max.total ? mes : max),
          performancePorMes[0] || { mes: "N/A", total: 0 }
        ),
      },
    };
  };

  const gerarRelatorio = () => {
    try {
      // Aplicar filtros e obter protocolos filtrados
      const protocolosFiltrados = aplicarFiltros();

      // Gerar análise completa
      const analise = gerarAnaliseCompleta(protocolosFiltrados);
      setAnaliseCompleta(analise);

      // Recalcular métricas com base nos protocolos filtrados
      calcularMetricas(protocolosFiltrados);
      calcularDistribuicaoServicos();
      calcularPerformanceUsuarios();
      calcularDadosTemporais();

      // Marcar relatório como gerado
      setRelatorioGerado(true);

      toast.success(
        "Relatório completo gerado com sucesso! Use os botões de exportação para baixar."
      );
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    }
  };

  const exportarRelatorio = (tipo: string) => {
    try {
      if (tipo === "excel") {
        exportarExcel();
      } else if (tipo === "pdf") {
        exportarPDF();
      }
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  const exportarExcel = () => {
    if (!relatorioGerado || !analiseCompleta) {
      toast.error("Gere um relatório primeiro antes de exportar!");
      return;
    }

    // Importar dinamicamente para evitar problemas de SSR
    import("xlsx")
      .then((XLSX) => {
        // Preparar dados dos protocolos filtrados
        const dadosProtocolos = (protocolosFiltrados || []).map((protocolo) => {
          const dataAbertura = new Date(protocolo.created_at);
          const dataConclusao = protocolo.data_conclusao
            ? new Date(protocolo.data_conclusao)
            : null;
          const tempoProcessamento = dataConclusao
            ? Math.ceil(
                (dataConclusao.getTime() - dataAbertura.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;

          return {
            Protocolo: protocolo.protocolo,
            Solicitante: protocolo.solicitante,
            "CPF/CNPJ": protocolo.cpf_cnpj,
            Email: protocolo.email,
            Telefone: protocolo.telefone,
            Serviços: Array.isArray(protocolo.servicos)
              ? protocolo.servicos.join(", ")
              : protocolo.servicos,
            Status: protocolo.status,
            "Data Abertura": dataAbertura.toLocaleDateString("pt-BR"),
            "Data Conclusão": dataConclusao
              ? dataConclusao.toLocaleDateString("pt-BR")
              : protocolo.status === "Concluído"
              ? "N/A"
              : "-",
            "Tempo Processamento":
              tempoProcessamento !== null
                ? `${tempoProcessamento} dias`
                : protocolo.status === "Concluído"
                ? "N/A"
                : "Em andamento",
            "Prazo Execução": protocolo.prazo_execucao
              ? new Date(protocolo.prazo_execucao).toLocaleDateString("pt-BR")
              : "N/A",
            Observações: protocolo.observacao || "N/A",
          };
        });

        // Criar workbook
        const wb = XLSX.utils.book_new();

        // Adicionar aba com dados dos protocolos
        const wsProtocolos = XLSX.utils.json_to_sheet(dadosProtocolos);
        XLSX.utils.book_append_sheet(wb, wsProtocolos, "Protocolos");

        // Adicionar aba com Resumo Executivo
        const resumoData = [
          {
            Métrica: "Total de Protocolos",
            Valor: analiseCompleta?.resumo.totalProtocolos || 0,
          },
          {
            Métrica: "Protocolos Concluídos",
            Valor: analiseCompleta?.resumo.protocolosConcluidos || 0,
          },
          {
            Métrica: "Protocolos em Andamento",
            Valor: analiseCompleta?.resumo.protocolosEmAndamento || 0,
          },
          {
            Métrica: "Protocolos Aguardando Análise",
            Valor: analiseCompleta?.resumo.protocolosAguardando || 0,
          },
          {
            Métrica: "Protocolos Pendentes",
            Valor: analiseCompleta?.resumo.protocolosPendentes || 0,
          },
          {
            Métrica: "Taxa de Conclusão (%)",
            Valor: analiseCompleta?.resumo.taxaConclusao || 0,
          },
        ];
        const wsResumo = XLSX.utils.json_to_sheet(resumoData);
        XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Executivo");

        // Adicionar aba com Análise de Performance
        const performanceData = [
          {
            Métrica: "Tempo Médio de Processamento (dias)",
            Valor: analiseCompleta?.tempoProcessamento.tempoMedio || 0,
          },
          {
            Métrica: "Tempo Mínimo de Processamento (dias)",
            Valor: analiseCompleta?.tempoProcessamento.tempoMinimo || 0,
          },
          {
            Métrica: "Tempo Máximo de Processamento (dias)",
            Valor: analiseCompleta?.tempoProcessamento.tempoMaximo || 0,
          },
          {
            Métrica: "Total de Protocolos Analisados",
            Valor: analiseCompleta?.tempoProcessamento.totalAnalisados || 0,
          },
          {
            Métrica: "Taxa de Cumprimento de Prazo (%)",
            Valor: analiseCompleta?.performance.taxaCumprimentoPrazo || 0,
          },
          {
            Métrica: "Taxa de Conclusão 30 dias (%)",
            Valor: analiseCompleta?.performance.tendenciaConclusao30Dias || 0,
          },
          {
            Métrica: "Protocolos no Prazo",
            Valor: analiseCompleta?.insights.protocolosNoPrazo || 0,
          },
          {
            Métrica: "Protocolos Atrasados",
            Valor: analiseCompleta?.insights.protocolosAtrasados || 0,
          },
        ];
        const wsPerformance = XLSX.utils.json_to_sheet(performanceData);
        XLSX.utils.book_append_sheet(
          wb,
          wsPerformance,
          "Análise de Performance"
        );

        // Adicionar aba com Serviços Mais Demandados
        const servicosData =
          analiseCompleta?.servicos.maisDemandados.map(
            (item: any, index: number) => ({
              Posição: index + 1,
              Serviço: item.servico,
              Quantidade: item.count,
            })
          ) || [];

        // Adicionar estatísticas gerais
        servicosData.push(
          {
            Posição: "",
            Serviço: "TOTAL DE SERVIÇOS ÚNICOS",
            Quantidade: analiseCompleta?.servicos.totalServicosUnicos || 0,
          },
          {
            Posição: "",
            Serviço: "TOTAL DE SERVIÇOS REALIZADOS",
            Quantidade: analiseCompleta?.servicos.totalServicosRealizados || 0,
          },
          {
            Posição: "",
            Serviço: "SERVIÇO MAIS POPULAR",
            Quantidade: analiseCompleta?.insights.servicoMaisPopular || "N/A",
          }
        );

        const wsServicos = XLSX.utils.json_to_sheet(servicosData);
        XLSX.utils.book_append_sheet(
          wb,
          wsServicos,
          "Serviços Mais Demandados"
        );

        // Adicionar aba com Performance por Período
        const performancePorMesData =
          analiseCompleta?.performance.porMes.map((mes: any) => ({
            Período: mes.mes,
            Total: mes.total,
            Concluídos: mes.concluidos,
            "Em Andamento": mes.emAndamento,
            "Taxa de Conclusão (%)": mes.taxaConclusao,
          })) || [];

        const wsPerformanceMes = XLSX.utils.json_to_sheet(
          performancePorMesData
        );
        XLSX.utils.book_append_sheet(
          wb,
          wsPerformanceMes,
          "Performance por Período"
        );

        // Adicionar aba com distribuição por serviços
        if (distribuicaoServicos.length > 0) {
          const wsServicos = XLSX.utils.json_to_sheet(distribuicaoServicos);
          XLSX.utils.book_append_sheet(
            wb,
            wsServicos,
            "Distribuição por Serviços"
          );
        }

        // Gerar nome do arquivo com data atual
        const dataAtual = new Date()
          .toLocaleDateString("pt-BR")
          .replace(/\//g, "-");
        const nomeArquivo = `relatorio_protocolos_${dataAtual}.xlsx`;

        // Salvar arquivo
        XLSX.writeFile(wb, nomeArquivo);

        toast.success("Relatório Excel exportado com sucesso!");
      })
      .catch((error) => {
        console.error("Erro ao gerar Excel:", error);
        toast.error("Erro ao gerar Excel");
      });
  };

  // Função para remover acentos e caracteres especiais
  const removerAcentos = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");
  };

  // Função para verificar se há espaço suficiente na página
  const verificarEspacoPagina = (
    doc: any,
    yPosition: number,
    alturaNecessaria: number
  ) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const margemInferior = 30; // Margem de segurança reduzida
    return yPosition + alturaNecessaria < pageHeight - margemInferior;
  };

  // Função para adicionar nova página se necessário
  const adicionarNovaPaginaSeNecessario = (
    doc: any,
    yPosition: number,
    alturaNecessaria: number
  ) => {
    // Só quebrar página se realmente não houver espaço suficiente
    if (!verificarEspacoPagina(doc, yPosition, alturaNecessaria)) {
      doc.addPage();
      // Adicionar cabeçalho na nova página
      const darkColor = [33, 37, 41]; // Preto elegante
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("IA CARTORIOS", 20, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Gestao de Protocolos", 20, 25);
      return 50; // Retorna nova posição Y abaixo do cabeçalho
    }
    return yPosition;
  };

  // Função para quebrar texto longo em múltiplas linhas
  const quebrarTexto = (
    doc: any,
    texto: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = 5
  ) => {
    const palavras = texto.split(" ");
    let linha = "";
    let yAtual = y;

    for (let i = 0; i < palavras.length; i++) {
      const palavra = palavras[i];
      const linhaTeste = linha + (linha ? " " : "") + palavra;
      const larguraTexto = doc.getTextWidth(linhaTeste);

      if (larguraTexto > maxWidth && linha) {
        doc.text(linha, x, yAtual);
        linha = palavra;
        yAtual += lineHeight;

        // Verificar se precisa de nova página
        if (yAtual > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          yAtual = 20;
        }
      } else {
        linha = linhaTeste;
      }
    }

    if (linha) {
      doc.text(linha, x, yAtual);
    }

    return yAtual + lineHeight;
  };

  const exportarPDF = () => {
    if (!relatorioGerado || !analiseCompleta) {
      toast.error("Gere um relatório primeiro antes de exportar!");
      return;
    }

    // Importar dinamicamente para evitar problemas de SSR
    import("jspdf")
      .then(({ jsPDF }) => {
        import("jspdf-autotable")
          .then((autoTable) => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Cores simples
            const darkColor = [33, 37, 41];
            const mediumGray = [108, 117, 125];
            const primaryColor = [59, 130, 246];

            // Cabeçalho simples
            doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.rect(0, 0, pageWidth, 25, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("IA CARTORIOS", 20, 15);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Sistema de Gestao de Protocolos", 20, 20);

            doc.setFontSize(8);
            doc.text(
              `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
              pageWidth - 60,
              20
            );

            // Linha separadora
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            doc.line(20, 30, pageWidth - 20, 30);

            let yPosition = 45;

            // Título do relatório
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("RELATORIO DE PROTOCOLOS", 20, yPosition);
            yPosition += 15;

            // Filtros aplicados
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);

            let filtrosTexto = "Filtros: ";
            const filtros = [];

            if (dataInicio) {
              filtros.push(`Inicio: ${dataInicio.toLocaleDateString("pt-BR")}`);
            }
            if (dataFim) {
              filtros.push(`Fim: ${dataFim.toLocaleDateString("pt-BR")}`);
            }
            if (filtroStatus !== "todos") {
              const statusLabel =
                filtroStatus === "concluido"
                  ? "Concluidos"
                  : filtroStatus === "andamento"
                  ? "Em Andamento"
                  : filtroStatus === "aguardando"
                  ? "Aguardando"
                  : filtroStatus === "pendente"
                  ? "Pendente"
                  : filtroStatus;
              filtros.push(`Status: ${statusLabel}`);
            }
            if (filtroServico !== "todos") {
              filtros.push(`Servico: ${filtroServico}`);
            }

            if (filtros.length > 0) {
              filtrosTexto += filtros.join(" | ");
            } else {
              filtrosTexto += "Todos os protocolos";
            }

            doc.text(filtrosTexto, 20, yPosition);
            yPosition += 15;

            // Resumo Executivo
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text("RESUMO EXECUTIVO", 20, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);

            const resumoData = [
              `Total de Protocolos: ${
                analiseCompleta?.resumo.totalProtocolos || 0
              }`,
              `Concluidos: ${
                analiseCompleta?.resumo.protocolosConcluidos || 0
              }`,
              `Em Andamento: ${
                analiseCompleta?.resumo.protocolosEmAndamento || 0
              }`,
              `Aguardando: ${
                analiseCompleta?.resumo.protocolosAguardando || 0
              }`,
              `Pendentes: ${analiseCompleta?.resumo.protocolosPendentes || 0}`,
              `Taxa de Conclusao: ${
                analiseCompleta?.resumo.taxaConclusao || 0
              }%`,
            ];

            resumoData.forEach((item, index) => {
              doc.text(item, 20, yPosition + index * 6);
            });

            yPosition += resumoData.length * 6 + 15;

            // Análise de Performance
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text("ANALISE DE PERFORMANCE", 20, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);

            const performanceData = [
              `Tempo Medio: ${
                analiseCompleta?.tempoProcessamento.tempoMedio || 0
              } dias`,
              `Tempo Minimo: ${
                analiseCompleta?.tempoProcessamento.tempoMinimo || 0
              } dias`,
              `Tempo Maximo: ${
                analiseCompleta?.tempoProcessamento.tempoMaximo || 0
              } dias`,
              `Protocolos Analisados: ${
                analiseCompleta?.tempoProcessamento.totalAnalisados || 0
              }`,
              `Cumprimento de Prazo: ${
                analiseCompleta?.performance.taxaCumprimentoPrazo || 0
              }%`,
              `Conclusao (30 dias): ${
                analiseCompleta?.performance.tendenciaConclusao30Dias || 0
              }%`,
            ];

            performanceData.forEach((item, index) => {
              doc.text(item, 20, yPosition + index * 6);
            });

            yPosition += performanceData.length * 6 + 15;

            // Serviços Mais Demandados
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text("SERVICOS MAIS DEMANDADOS", 20, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);

            if (analiseCompleta?.servicos.maisDemandados) {
              analiseCompleta.servicos.maisDemandados
                .slice(0, 5)
                .forEach((item: any, index: number) => {
                  doc.text(
                    `${index + 1}. ${removerAcentos(item.servico)}: ${
                      item.count
                    }`,
                    20,
                    yPosition + index * 6
                  );
                });
              yPosition +=
                analiseCompleta.servicos.maisDemandados.slice(0, 5).length * 6 +
                10;
            }

            // Tabela de Protocolos
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text("PROTOCOLOS DETALHADOS", 20, yPosition);
            yPosition += 10;

            if (protocolosFiltrados && protocolosFiltrados.length > 0) {
              const dadosTabela = (protocolosFiltrados || []).map(
                (protocolo) => {
                  const dataAbertura = new Date(protocolo.created_at);
                  const dataConclusao = protocolo.data_conclusao
                    ? new Date(protocolo.data_conclusao)
                    : null;
                  const tempoProcessamento = dataConclusao
                    ? Math.ceil(
                        (dataConclusao.getTime() - dataAbertura.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;

                  return [
                    protocolo.protocolo,
                    removerAcentos(protocolo.solicitante),
                    Array.isArray(protocolo.servicos)
                      ? protocolo.servicos
                          .slice(0, 2)
                          .map((s: string) => removerAcentos(s))
                          .join(", ") +
                        (protocolo.servicos.length > 2 ? "..." : "")
                      : removerAcentos(protocolo.servicos) || "N/A",
                    removerAcentos(protocolo.status),
                    dataAbertura.toLocaleDateString("pt-BR"),
                    dataConclusao
                      ? dataConclusao.toLocaleDateString("pt-BR")
                      : protocolo.status === "Concluído"
                      ? "N/A"
                      : "-",
                    tempoProcessamento !== null
                      ? `${tempoProcessamento} dias`
                      : protocolo.status === "Concluído"
                      ? "N/A"
                      : "Em andamento",
                  ];
                }
              );

              autoTable.default(doc, {
                startY: yPosition,
                head: [
                  [
                    "Protocolo",
                    "Solicitante",
                    "Servicos",
                    "Status",
                    "Data Abertura",
                    "Data Conclusao",
                    "Tempo Processamento",
                  ],
                ],
                body: dadosTabela,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: {
                  fillColor: [darkColor[0], darkColor[1], darkColor[2]],
                  textColor: [255, 255, 255],
                  fontStyle: "bold",
                },
                alternateRowStyles: {
                  fillColor: [248, 249, 250],
                },
                columnStyles: {
                  0: { cellWidth: 25 },
                  1: { cellWidth: 35 },
                  2: { cellWidth: 40 },
                  3: { cellWidth: 20 },
                  4: { cellWidth: 20 },
                  5: { cellWidth: 20 },
                  6: { cellWidth: 25 },
                },
                margin: { left: 20, right: 20 },
              });
            }

            // Rodapé
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              doc.setFontSize(8);
              doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
              doc.text(
                `Pagina ${i} de ${pageCount}`,
                pageWidth - 30,
                doc.internal.pageSize.height - 10
              );
            }

            // Salvar o PDF
            const nomeArquivo = `relatorio_protocolos_${
              new Date().toISOString().split("T")[0]
            }.pdf`;
            doc.save(nomeArquivo);

            toast.success("Relatório exportado com sucesso!");
          })
          .catch((error) => {
            console.error("Erro ao carregar jspdf-autotable:", error);
            toast.error("Erro ao exportar relatório em PDF");
          });
      })
      .catch((error) => {
        console.error("Erro ao carregar jsPDF:", error);
        toast.error("Erro ao exportar relatório em PDF");
      });
  };

  const loading =
    protocolosLoading || usuariosLoading || servicosLoading || statusLoading;

  if (loading) {
    return (
      <MainLayout
        title="Relatórios e Business Intelligence"
        subtitle="Análise detalhada da performance e métricas do cartório"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Relatórios e Business Intelligence"
      subtitle="Análise detalhada da performance e métricas do cartório"
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Análise
            </CardTitle>
            <CardDescription>
              Configure os parâmetros para gerar relatórios personalizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data Início */}
              <div className="space-y-2">
                <Label>Data Início</Label>
                <DatePicker
                  selected={dataInicio || null}
                  onChange={(date) => setDataInicio(date || undefined)}
                  placeholderText="Selecionar data"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <DatePicker
                  selected={dataFim || null}
                  onChange={(date) => setDataFim(date || undefined)}
                  placeholderText="Selecionar data"
                />
              </div>

              {/* Filtro Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Serviço */}
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={filtroServico} onValueChange={setFiltroServico}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {servicoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => gerarRelatorio()}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Relatório Gerado */}
        {relatorioGerado && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Relatório Gerado
                  </CardTitle>
                  <CardDescription>
                    Relatório baseado nos filtros aplicados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportarRelatorio("excel")}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportarRelatorio("pdf")}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analiseCompleta && (
                <div className="space-y-12">
                  {/* Resumo Executivo */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      📊 Resumo Executivo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <div className="text-2xl font-bold text-blue-600">
                          {analiseCompleta.resumo.totalProtocolos}
                        </div>
                        <div className="text-sm text-blue-800">
                          Total de Protocolos
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                        <div className="text-2xl font-bold text-green-600">
                          {analiseCompleta.resumo.protocolosConcluidos}
                        </div>
                        <div className="text-sm text-green-800">Concluídos</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                        <div className="text-2xl font-bold text-yellow-600">
                          {analiseCompleta.resumo.protocolosEmAndamento}
                        </div>
                        <div className="text-sm text-yellow-800">
                          Em Andamento
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                        <div className="text-2xl font-bold text-purple-600">
                          {analiseCompleta.resumo.taxaConclusao}%
                        </div>
                        <div className="text-sm text-purple-800">
                          Taxa de Conclusão
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Análise de Performance */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      ⚡ Análise de Performance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-xl font-bold text-gray-700">
                          {analiseCompleta.tempoProcessamento.tempoMedio} dias
                        </div>
                        <div className="text-sm text-gray-600">
                          Tempo Médio de Processamento
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Baseado em{" "}
                          {analiseCompleta.tempoProcessamento.totalAnalisados}{" "}
                          protocolos concluídos
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-xl font-bold text-green-600">
                          {analiseCompleta.performance.taxaCumprimentoPrazo}%
                        </div>
                        <div className="text-sm text-green-800">
                          Taxa de Cumprimento de Prazo
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {analiseCompleta.insights.protocolosNoPrazo} de{" "}
                          {analiseCompleta.insights.protocolosNoPrazo +
                            analiseCompleta.insights.protocolosAtrasados}{" "}
                          protocolos
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">
                          {analiseCompleta.performance.tendenciaConclusao30Dias}
                          %
                        </div>
                        <div className="text-sm text-blue-800">
                          Taxa de Conclusão (30 dias)
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Tendência recente
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Serviços Mais Demandados */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      🏆 Serviços Mais Demandados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {analiseCompleta.servicos.maisDemandados
                          .slice(0, 3)
                          .map((item: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                    index === 0
                                      ? "bg-yellow-500"
                                      : index === 1
                                      ? "bg-gray-400"
                                      : "bg-orange-500"
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <span className="font-medium">
                                  {item.servico}
                                </span>
                              </div>
                              <span className="text-lg font-bold text-gray-700">
                                {item.count}
                              </span>
                            </div>
                          ))}
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">
                          Estatísticas Gerais
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total de Serviços Únicos:</span>
                            <span className="font-bold">
                              {analiseCompleta.servicos.totalServicosUnicos}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total de Serviços Realizados:</span>
                            <span className="font-bold">
                              {analiseCompleta.servicos.totalServicosRealizados}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Serviço Mais Popular:</span>
                            <span className="font-bold text-blue-600">
                              {analiseCompleta.insights.servicoMaisPopular}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance por Mês */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      📈 Performance por Período
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-3 text-left">Período</th>
                            <th className="border p-3 text-center">Total</th>
                            <th className="border p-3 text-center">
                              Concluídos
                            </th>
                            <th className="border p-3 text-center">
                              Em Andamento
                            </th>
                            <th className="border p-3 text-center">
                              Taxa de Conclusão
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {analiseCompleta.performance.porMes.map(
                            (mes: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border p-3 font-medium">
                                  {mes.mes}
                                </td>
                                <td className="border p-3 text-center">
                                  {mes.total}
                                </td>
                                <td className="border p-3 text-center text-green-600 font-semibold">
                                  {mes.concluidos}
                                </td>
                                <td className="border p-3 text-center text-yellow-600 font-semibold">
                                  {mes.emAndamento}
                                </td>
                                <td className="border p-3 text-center">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      mes.taxaConclusao >= 80
                                        ? "bg-green-100 text-green-800"
                                        : mes.taxaConclusao >= 60
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {mes.taxaConclusao}%
                                  </span>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Insights e Recomendações */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      💡 Insights e Recomendações
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                        <h4 className="font-semibold text-green-800 mb-2">
                          ✅ Pontos Fortes
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>
                            • Taxa de cumprimento de prazo:{" "}
                            {analiseCompleta.performance.taxaCumprimentoPrazo}%
                          </li>
                          <li>
                            • Serviço mais demandado:{" "}
                            {analiseCompleta.insights.servicoMaisPopular}
                          </li>
                          <li>
                            • Mês mais produtivo:{" "}
                            {analiseCompleta.insights.mesMaisProdutivo.mes}
                          </li>
                        </ul>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <h4 className="font-semibold text-blue-800 mb-2">
                          📊 Métricas de Eficiência
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>
                            • Tempo mínimo de processamento:{" "}
                            {analiseCompleta.tempoProcessamento.tempoMinimo}{" "}
                            dias
                          </li>
                          <li>
                            • Tempo máximo de processamento:{" "}
                            {analiseCompleta.tempoProcessamento.tempoMaximo}{" "}
                            dias
                          </li>
                          <li>
                            • Protocolos em andamento:{" "}
                            {analiseCompleta.resumo.protocolosEmAndamento}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Protocolos
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas.totalProtocolos.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% em relação ao período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas.protocolosConcluidos.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {metricas.taxaConclusao}% de taxa de conclusão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Andamento
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas.protocolosAndamento}
              </div>
              <p className="text-xs text-muted-foreground">
                Aguardando processamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas.tempoMedioProcessamento} dias
              </div>
              <p className="text-xs text-muted-foreground">
                -0.5 dias vs. período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa Conclusão
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas.taxaConclusao}%
              </div>
              <p className="text-xs text-muted-foreground">
                +3.2% vs. período anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução Temporal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução dos Protocolos</CardTitle>
              <CardDescription>
                Comparativo entre protocolos abertos e concluídos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dadosTempoReal.every((item) => item.protocolos === 0) ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum dado disponível
                  </h3>
                  <p className="text-gray-500">
                    Os dados aparecerão aqui conforme os protocolos forem sendo
                    cadastrados.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dadosTempoReal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="abertos"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Em Andamento"
                    />
                    <Area
                      type="monotone"
                      dataKey="concluidos"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Concluídos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Distribuição por Serviços */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Serviços</CardTitle>
              <CardDescription>
                Volume de protocolos por tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distribuicaoServicos.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum serviço cadastrado
                  </h3>
                  <p className="text-gray-500">
                    A distribuição por serviços aparecerá aqui conforme os
                    protocolos forem sendo cadastrados.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribuicaoServicos}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ servico, quantidade }) =>
                        `${servico}: ${quantidade}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantidade"
                    >
                      {distribuicaoServicos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tempo de Processamento */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Processamento</CardTitle>
              <CardDescription>
                Tempo médio de processamento por dia da semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tempoProcessamento.every((item) => item.tempo === 0) ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum dado de tempo disponível
                  </h3>
                  <p className="text-gray-500">
                    Os dados de tempo de processamento aparecerão aqui conforme
                    os protocolos forem sendo concluídos.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tempoProcessamento}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="tempo"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Performance dos Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Usuários</CardTitle>
              <CardDescription>Taxa de conclusão por usuário</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceUsuarios.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum usuário com protocolos
                  </h3>
                  <p className="text-gray-500">
                    A performance dos usuários aparecerá aqui conforme os
                    protocolos forem sendo atribuídos.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceUsuarios} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="usuario" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="taxa" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Performance Detalhada */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Detalhada dos Usuários</CardTitle>
            <CardDescription>
              Análise completa da produtividade por usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performanceUsuarios.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum dado de performance disponível
                </h3>
                <p className="text-gray-500">
                  Os dados de performance aparecerão aqui conforme os usuários
                  forem processando protocolos.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Protocolos Atribuídos</TableHead>
                    <TableHead>Protocolos Concluídos</TableHead>
                    <TableHead>Taxa de Conclusão</TableHead>
                    <TableHead>Tempo Médio</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceUsuarios.map((usuario) => (
                    <TableRow key={usuario.usuario}>
                      <TableCell className="font-medium">
                        {usuario.usuario}
                      </TableCell>
                      <TableCell>{usuario.protocolos}</TableCell>
                      <TableCell>{usuario.concluidos}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{usuario.taxa}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${usuario.taxa}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>3.2 dias</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            usuario.taxa >= 90
                              ? "bg-green-100 text-green-800"
                              : usuario.taxa >= 80
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {usuario.taxa >= 90
                            ? "Excelente"
                            : usuario.taxa >= 80
                            ? "Bom"
                            : "Precisa Melhorar"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Relatorios;
