"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency, parseCurrency } from "@/lib/formatters";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = "R$ 0,00",
  id,
  className,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatCurrency(inputValue);

    setDisplayValue(formatted);
    onChange(formatted);
  };

  const handleFocus = () => {
    // Remove formatação ao focar para facilitar edição
    if (displayValue) {
      const numbers = displayValue.replace(/\D/g, "");
      setDisplayValue(numbers);
    }
  };

  const handleBlur = () => {
    // Aplica formatação ao sair do campo
    if (displayValue) {
      const formatted = formatCurrency(displayValue);
      setDisplayValue(formatted);
      onChange(formatted);
    }
  };

  return (
    <Input
      id={id}
      type="text"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      disabled={disabled}
    />
  );
};
