// Utilitários de formatação para campos de formulário

/**
 * Formata um número de telefone brasileiro
 * @param value - Valor a ser formatado
 * @returns Telefone formatado (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export const formatPhone = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  // Limita a 11 dígitos
  const limitedNumbers = numbers.slice(0, 11);

  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
  } else if (limitedNumbers.length <= 10) {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(
      2,
      6
    )}-${limitedNumbers.slice(6)}`;
  } else {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(
      2,
      7
    )}-${limitedNumbers.slice(7)}`;
  }
};

/**
 * Formata um CPF
 * @param value - Valor a ser formatado
 * @returns CPF formatado XXX.XXX.XXX-XX
 */
export const formatCPF = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  // Limita a 11 dígitos
  const limitedNumbers = numbers.slice(0, 11);

  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
  } else if (limitedNumbers.length <= 9) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(
      3,
      6
    )}.${limitedNumbers.slice(6)}`;
  } else {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(
      3,
      6
    )}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9)}`;
  }
};

/**
 * Formata um CNPJ
 * @param value - Valor a ser formatado
 * @returns CNPJ formatado XX.XXX.XXX/XXXX-XX
 */
export const formatCNPJ = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  // Limita a 14 dígitos
  const limitedNumbers = numbers.slice(0, 14);

  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 5) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
  } else if (limitedNumbers.length <= 8) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(
      2,
      5
    )}.${limitedNumbers.slice(5)}`;
  } else if (limitedNumbers.length <= 12) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(
      2,
      5
    )}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
  } else {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(
      2,
      5
    )}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(
      8,
      12
    )}-${limitedNumbers.slice(12)}`;
  }
};

/**
 * Formata CPF ou CNPJ automaticamente baseado no tamanho
 * @param value - Valor a ser formatado
 * @returns CPF ou CNPJ formatado
 */
export const formatCPFCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, "");

  if (numbers.length <= 11) {
    return formatCPF(value);
  } else {
    return formatCNPJ(value);
  }
};

/**
 * Formata um CEP
 * @param value - Valor a ser formatado
 * @returns CEP formatado XXXXX-XXX
 */
export const formatCEP = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  // Limita a 8 dígitos
  const limitedNumbers = numbers.slice(0, 8);

  if (limitedNumbers.length <= 5) {
    return limitedNumbers;
  } else {
    return `${limitedNumbers.slice(0, 5)}-${limitedNumbers.slice(5)}`;
  }
};

/**
 * Formata um número de protocolo
 * @param value - Valor a ser formatado
 * @returns Protocolo formatado (remove caracteres especiais e converte para maiúsculo)
 */
export const formatProtocol = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
};

/**
 * Formata um email (remove espaços e converte para minúsculo)
 * @param value - Valor a ser formatado
 * @returns Email formatado
 */
export const formatEmail = (value: string): string => {
  return value.toLowerCase().trim();
};

/**
 * Valida se um CPF é válido
 * @param cpf - CPF a ser validado
 * @returns true se válido, false caso contrário
 */
export const isValidCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, "");

  if (numbers.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;

  return true;
};

/**
 * Valida se um CNPJ é válido
 * @param cnpj - CNPJ a ser validado
 * @returns true se válido, false caso contrário
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, "");

  if (numbers.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(numbers)) return false;

  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (firstDigit !== parseInt(numbers[12])) return false;

  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (secondDigit !== parseInt(numbers[13])) return false;

  return true;
};

/**
 * Valida se um telefone brasileiro é válido
 * @param phone - Telefone a ser validado
 * @returns true se válido, false caso contrário
 */
export const isValidPhone = (phone: string): boolean => {
  const numbers = phone.replace(/\D/g, "");
  return numbers.length === 10 || numbers.length === 11;
};

/**
 * Valida se um CEP é válido
 * @param cep - CEP a ser validado
 * @returns true se válido, false caso contrário
 */
export const isValidCEP = (cep: string): boolean => {
  const numbers = cep.replace(/\D/g, "");
  return numbers.length === 8;
};

/**
 * Valida se um email é válido
 * @param email - Email a ser validado
 * @returns true se válido, false caso contrário
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
