"use client";

import React from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { ChatNotificationsProvider } from "@/contexts/chat-notifications-context";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChatNotificationsProvider>
        {children}
        <Toaster />
      </ChatNotificationsProvider>
    </AuthProvider>
  );
}
