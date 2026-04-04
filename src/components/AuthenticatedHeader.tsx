"use client";

import { Button } from "@/components/ui/Button";
import { Settings, LogOut, Plane } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export const AuthenticatedHeader = () => {
  const { signOut, user } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Same as landing page */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Vibe Trip</span>
          </Link>

          {/* Right side - Settings and Sign Out */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AuthenticatedHeader;
