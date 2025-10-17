"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingAnimation } from "@/components/ui/loading-spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingAnimation size="lg" variant="wave" />
        </div>
      )
    );
  }

  if (!user) {
    return null; // Será redirecionado pelo useEffect
  }

  return <>{children}</>;
}
