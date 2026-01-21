import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

interface CartorioValidationResult {
  isValid: boolean;
  missingFields: string[];
  isLoading: boolean;
}

const REQUIRED_FIELDS = [
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
  { key: "endereco", label: "Endereço" },
  { key: "numero_oficio", label: "Número do Ofício" },
  { key: "tabeliao_responsavel", label: "Tabelião Responsável" },
];

export const useCartorioValidation = (): CartorioValidationResult & { revalidate: () => void } => {
  const { user } = useAuth();
  const [isValid, setIsValid] = useState(true);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const validateCartorio = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Buscar cartorio_id do usuário
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("cartorio_id")
          .eq("id", user.id)
          .single();

        if (userError || !userData?.cartorio_id) {
          setIsValid(true); // Se não houver cartório, não mostrar aviso
          setMissingFields([]);
          setIsLoading(false);
          return;
        }

        // Buscar dados do cartório
        const { data: cartorioData, error: cartorioError } = await supabase
          .from("cartorios")
          .select("cidade, estado, endereco, numero_oficio, tabeliao_responsavel")
          .eq("id", userData.cartorio_id)
          .single();

        if (cartorioError || !cartorioData) {
          setIsValid(true);
          setMissingFields([]);
          setIsLoading(false);
          return;
        }

        // Verificar campos obrigatórios
        const missing: string[] = [];
        REQUIRED_FIELDS.forEach((field) => {
          const value = cartorioData[field.key as keyof typeof cartorioData];
          if (!value || (typeof value === "string" && value.trim() === "")) {
            missing.push(field.label);
          }
        });

        setMissingFields(missing);
        setIsValid(missing.length === 0);
      } catch (error) {
        console.error("Erro ao validar dados do cartório:", error);
        setIsValid(true); // Em caso de erro, não mostrar aviso
        setMissingFields([]);
      } finally {
        setIsLoading(false);
      }
    };

    validateCartorio();

    // Revalidar quando o usuário mudar ou quando o trigger mudar
    const interval = setInterval(validateCartorio, 30000); // Revalidar a cada 30 segundos

    return () => clearInterval(interval);
  }, [user, refreshTrigger]);

  const revalidate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { isValid, missingFields, isLoading, revalidate };
};
