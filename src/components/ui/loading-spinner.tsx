"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "dots" | "pulse" | "wave";
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "default",
  className,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const baseClasses =
    "animate-spin rounded-full border-2 border-gray-200 border-t-blue-600";

  if (variant === "dots") {
    return (
      <div className={cn("flex space-x-1", className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-blue-600 animate-pulse",
              size === "sm" && "h-2 w-2",
              size === "md" && "h-3 w-3",
              size === "lg" && "h-4 w-4",
              size === "xl" && "h-6 w-6"
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          "rounded-full bg-blue-600 animate-pulse",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (variant === "wave") {
    return (
      <div className={cn("flex space-x-1", className)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "bg-blue-600 rounded-sm animate-pulse",
              size === "sm" && "h-3 w-1",
              size === "md" && "h-4 w-1",
              size === "lg" && "h-6 w-1",
              size === "xl" && "h-8 w-1"
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: "1.2s",
            }}
          />
        ))}
      </div>
    );
  }

  // Default spinner
  return <div className={cn(baseClasses, sizeClasses[size], className)} />;
};

// Componente de loading com animação mais elaborada
export const LoadingAnimation: React.FC<{
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "dots" | "pulse" | "wave";
  className?: string;
}> = ({ size = "md", variant = "default", className }) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <LoadingSpinner size={size} variant={variant} />
    </div>
  );
};
