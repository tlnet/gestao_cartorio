"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_CONTA_LABELS,
  FiltrosContas,
  StatusConta,
  CategoriaConta,
} from "@/types";
import { useCategoriasPersonalizadas } from "@/hooks/use-categorias-personalizadas";
import { CategoriaBadge } from "./categoria-badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Filter, X, Search } from "lucide-react";

interface FiltrosContasProps {
  onFiltrosChange: (filtros: FiltrosContas) => void;
  loading?: boolean;
  cartorioId?: string;
}

export function FiltrosContasComponent({
  onFiltrosChange,
  loading,
  cartorioId,
}: FiltrosContasProps) {
  const [busca, setBusca] = useState("");
  const [statusSelecionados, setStatusSelecionados] = useState<StatusConta[]>(
    []
  );
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    CategoriaConta[]
  >([]);
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [fornecedor, setFornecedor] = useState("");

  // Hook para categorias personalizadas
  const { categorias: categoriasPersonalizadas } =
    useCategoriasPersonalizadas(cartorioId);

  // Função para obter categorias disponíveis (personalizadas + padrão)
  const getCategoriasDisponiveis = () => {
    const categoriasPadrao = [
      { id: "ALUGUEL", nome: "Aluguel", cor: "#EF4444" },
      { id: "ENERGIA", nome: "Energia Elétrica", cor: "#F59E0B" },
      { id: "AGUA", nome: "Água", cor: "#06B6D4" },
      { id: "INTERNET", nome: "Internet", cor: "#8B5CF6" },
      { id: "TELEFONE", nome: "Telefone", cor: "#10B981" },
      {
        id: "MATERIAL_ESCRITORIO",
        nome: "Material de Escritório",
        cor: "#84CC16",
      },
      { id: "SALARIOS", nome: "Salários", cor: "#F97316" },
      { id: "IMPOSTOS", nome: "Impostos", cor: "#DC2626" },
      {
        id: "SERVICOS_TERCEIROS",
        nome: "Serviços de Terceiros",
        cor: "#6366F1",
      },
      { id: "MANUTENCAO", nome: "Manutenção", cor: "#EC4899" },
      { id: "SOFTWARE", nome: "Software", cor: "#14B8A6" },
      { id: "OUTROS", nome: "Outros", cor: "#6B7280" },
    ];

    // Se há categorias personalizadas, usar apenas elas
    if (categoriasPersonalizadas.length > 0) {
      return categoriasPersonalizadas.map((cat) => ({
        id: cat.id,
        nome: cat.nome,
        cor: cat.cor,
      }));
    }

    // Senão, usar categorias padrão
    return categoriasPadrao;
  };

  const aplicarFiltros = () => {
    const filtros: FiltrosContas = {};

    if (busca) filtros.busca = busca;
    if (statusSelecionados.length > 0) filtros.status = statusSelecionados;
    if (categoriasSelecionadas.length > 0)
      filtros.categoria = categoriasSelecionadas;
    if (dataInicio) filtros.dataInicio = dataInicio;
    if (dataFim) filtros.dataFim = dataFim;
    if (fornecedor) filtros.fornecedor = fornecedor;

    onFiltrosChange(filtros);
  };

  const limparFiltros = () => {
    setBusca("");
    setStatusSelecionados([]);
    setCategoriasSelecionadas([]);
    setDataInicio(undefined);
    setDataFim(undefined);
    setFornecedor("");
    onFiltrosChange({});
  };

  const toggleStatus = (status: StatusConta) => {
    setStatusSelecionados((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleCategoria = (categoria: CategoriaConta) => {
    setCategoriasSelecionadas((prev) =>
      prev.includes(categoria)
        ? prev.filter((c) => c !== categoria)
        : [...prev, categoria]
    );
  };

  const temFiltrosAtivos =
    busca ||
    statusSelecionados.length > 0 ||
    categoriasSelecionadas.length > 0 ||
    dataInicio ||
    dataFim ||
    fornecedor;

  return (
    <div className="space-y-4">
      {/* Barra de Busca */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
            className="pl-10"
            disabled={loading}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={aplicarFiltros} disabled={loading}>
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          {temFiltrosAtivos && (
            <Button
              variant="outline"
              onClick={limparFiltros}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros Avançados */}
      <div className="flex flex-wrap gap-2">
        {/* Filtro de Status */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              Status
              {statusSelecionados.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {statusSelecionados.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filtrar por Status</h4>
              {Object.entries(STATUS_CONTA_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={statusSelecionados.includes(key as StatusConta)}
                    onChange={() => toggleStatus(key as StatusConta)}
                    className="rounded"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro de Categoria */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              Categoria
              {categoriasSelecionadas.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {categoriasSelecionadas.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filtrar por Categoria</h4>
              {getCategoriasDisponiveis().map((categoria) => (
                <label
                  key={categoria.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={categoriasSelecionadas.includes(
                      categoria.id as CategoriaConta
                    )}
                    onChange={() =>
                      toggleCategoria(categoria.id as CategoriaConta)
                    }
                    className="rounded"
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoria.cor || "#6B7280" }}
                    />
                    <span className="text-sm">{categoria.nome}</span>
                  </div>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro de Data Início */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dataInicio
                ? format(dataInicio, "dd/MM/yy", { locale: ptBR })
                : "Data Início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DatePicker
              selected={dataInicio}
              onChange={setDataInicio}
              placeholderText="Selecione a data"
            />
          </PopoverContent>
        </Popover>

        {/* Filtro de Data Fim */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dataFim
                ? format(dataFim, "dd/MM/yy", { locale: ptBR })
                : "Data Fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DatePicker
              selected={dataFim}
              onChange={setDataFim}
              placeholderText="Selecione a data"
            />
          </PopoverContent>
        </Popover>

        {/* Filtro de Fornecedor */}
        <Input
          placeholder="Fornecedor..."
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
          className="w-48"
          disabled={loading}
        />
      </div>

      {/* Filtros Ativos */}
      {temFiltrosAtivos && (
        <div className="flex flex-wrap gap-2">
          {busca && (
            <Badge variant="secondary">
              Busca: {busca}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => {
                  setBusca("");
                  aplicarFiltros();
                }}
              />
            </Badge>
          )}
          {statusSelecionados.map((status) => (
            <Badge key={status} variant="secondary">
              {STATUS_CONTA_LABELS[status]}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => {
                  toggleStatus(status);
                  aplicarFiltros();
                }}
              />
            </Badge>
          ))}
          {categoriasSelecionadas.map((categoria) => {
            const categoriaInfo = getCategoriasDisponiveis().find(
              (cat) => cat.id === categoria
            );
            return (
              <Badge
                key={categoria}
                variant="secondary"
                className="text-white font-medium"
                style={{
                  backgroundColor: categoriaInfo?.cor || "#6B7280",
                  border: `1px solid ${categoriaInfo?.cor || "#6B7280"}`,
                }}
              >
                {categoriaInfo?.nome || categoria}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => {
                    toggleCategoria(categoria);
                    aplicarFiltros();
                  }}
                />
              </Badge>
            );
          })}
          {fornecedor && (
            <Badge variant="secondary">
              Fornecedor: {fornecedor}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => {
                  setFornecedor("");
                  aplicarFiltros();
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
