"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedTableProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const AnimatedTable: React.FC<AnimatedTableProps> = ({
  children,
  className,
  staggerDelay = 50,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8",
        className
      )}
    >
      {children}
    </div>
  );
};

// Componente para animar linhas de tabela
export const AnimatedTableRow: React.FC<{
  children: React.ReactNode;
  index: number;
  staggerDelay?: number;
  className?: string;
}> = ({ children, index, staggerDelay = 50, className }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 200 + index * staggerDelay);

    return () => clearTimeout(timer);
  }, [index, staggerDelay]);

  return (
    <tr
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {children}
    </tr>
  );
};

// Componente para animar cards em grid
export const AnimatedGrid: React.FC<{
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}> = ({ children, className, staggerDelay = 100 }) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="transition-all duration-500 ease-out"
          style={{
            animationDelay: `${index * staggerDelay}ms`,
            animation: `fadeInUp 0.5s ease-out ${index * staggerDelay}ms both`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};
