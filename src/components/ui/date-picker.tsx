"use client";

import React, { forwardRef } from "react";
import ReactDatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-datepicker/dist/react-datepicker.css";

// Registrar locale português
registerLocale("pt-BR", ptBR);

interface DatePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  placeholderText?: string;
  className?: string;
}

export const DatePicker = forwardRef<any, DatePickerProps>(
  ({ selected, onChange, disabled, placeholderText, className }, ref) => {
    return (
      <div className="relative">
        <ReactDatePicker
          selected={selected}
          onChange={onChange}
          disabled={disabled}
          placeholderText={placeholderText || "Selecione a data"}
          dateFormat="dd/MM/yyyy"
          locale="pt-BR"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          wrapperClassName="w-full"
          calendarClassName="custom-calendar"
          showPopperArrow={false}
          ref={ref as any}
        />
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
