"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserSkeletonProps {
  showEmail?: boolean;
  showRole?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "header" | "sidebar";
}

export const UserSkeleton: React.FC<UserSkeletonProps> = ({
  showEmail = true,
  showRole = false,
  size = "md",
  variant = "header",
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizeClasses = {
    sm: "h-3 w-16",
    md: "h-4 w-20",
    lg: "h-4 w-24",
  };

  const emailSizeClasses = {
    sm: "h-3 w-24",
    md: "h-3 w-28",
    lg: "h-3 w-32",
  };

  if (variant === "header") {
    return (
      <div className="flex items-center space-x-2">
        <Avatar className={sizeClasses[size]}>
          <AvatarFallback className="bg-gray-200 animate-pulse">
            <Skeleton className="h-4 w-4 rounded-full" />
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:block text-left space-y-1">
          <Skeleton className={`${textSizeClasses[size]} rounded`} />
          {showEmail && (
            <Skeleton className={`${emailSizeClasses[size]} rounded`} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Avatar className={sizeClasses[size]}>
            <AvatarFallback className="bg-gray-200 animate-pulse">
              <Skeleton className="h-4 w-4 rounded-full" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className={`${textSizeClasses[size]} rounded`} />
            {showEmail && (
              <Skeleton className={`${emailSizeClasses[size]} rounded`} />
            )}
          </div>
        </div>

        {showRole && (
          <div className="flex justify-center">
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
