"use client";

import { Badge } from "@/components/ui/badge";
import { CategoriaPersonalizada } from "@/types";
import { LoadingAnimation } from "@/components/ui/loading-spinner";

interface CategoriaBadgeProps {
  categoriaId: string;
  categoriasPersonalizadas: CategoriaPersonalizada[];
  loading?: boolean;
}

export function CategoriaBadge({
  categoriaId,
  categoriasPersonalizadas,
  loading = false,
}: CategoriaBadgeProps) {
  // Função para obter informações da categoria
  const getCategoriaInfo = () => {
    // Se é uma categoria personalizada (UUID), buscar pelo ID
    if (categoriasPersonalizadas.length > 0) {
      const categoriaPersonalizada = categoriasPersonalizadas.find(
        (cat) => cat.id === categoriaId
      );
      if (categoriaPersonalizada) {
        return {
          nome: categoriaPersonalizada.nome,
          cor: categoriaPersonalizada.cor,
        };
      }
    }

    // Se não encontrou nas personalizadas, verificar se é uma categoria padrão
    const categoriasPadrao: Record<string, { nome: string; cor: string }> = {
      ALUGUEL: { nome: "Aluguel", cor: "#EF4444" },
      ENERGIA: { nome: "Energia Elétrica", cor: "#F59E0B" },
      AGUA: { nome: "Água", cor: "#06B6D4" },
      INTERNET: { nome: "Internet", cor: "#8B5CF6" },
      TELEFONE: { nome: "Telefone", cor: "#10B981" },
      MATERIAL_ESCRITORIO: { nome: "Material de Escritório", cor: "#84CC16" },
      SALARIOS: { nome: "Salários", cor: "#F97316" },
      IMPOSTOS: { nome: "Impostos", cor: "#DC2626" },
      SERVICOS_TERCEIROS: { nome: "Serviços de Terceiros", cor: "#6366F1" },
      MANUTENCAO: { nome: "Manutenção", cor: "#EC4899" },
      SOFTWARE: { nome: "Software", cor: "#14B8A6" },
      OUTROS: { nome: "Outros", cor: "#6B7280" },
    };

    return (
      categoriasPadrao[categoriaId] || { nome: categoriaId, cor: "#6B7280" }
    );
  };

  const categoriaInfo = getCategoriaInfo();

  // Se estiver carregando, mostrar um badge com spinner (mesmo estilo dos documentos)
  if (loading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <LoadingAnimation size="sm" variant="dots" />
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="text-white font-medium"
      style={{
        backgroundColor: categoriaInfo.cor,
        border: `1px solid ${categoriaInfo.cor}`,
      }}
    >
      {categoriaInfo.nome}
    </Badge>
  );
}
