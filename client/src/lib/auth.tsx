import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SignupData, SigninData } from "./api";

interface StoreProfile {
  id: string;
  ownerName: string;
  phone: string;
  name: string;
  gstin?: string;
  email?: string;
  address?: string;
  shopPhoto?: string;
  plan: string;
  templateId: string;
  createdAt: string;
}

interface AuthContextType {
  user: StoreProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (data: SignupData) => Promise<StoreProfile>;
  signin: (data: SigninData) => Promise<StoreProfile>;
  signout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery<StoreProfile | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupData) => api.auth.signup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  const signinMutation = useMutation({
    mutationFn: (data: SigninData) => api.auth.signin(data),
    onSuccess: (data) => {
      // Save last logged-in user info to localStorage for quick login
      if (data) {
        localStorage.setItem("lastUser", JSON.stringify({
          phone: data.phone,
          name: data.ownerName || data.name,
          shopPhoto: data.shopPhoto,
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  const signoutMutation = useMutation({
    mutationFn: () => api.auth.signout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const signup = async (data: SignupData): Promise<StoreProfile> => {
    return signupMutation.mutateAsync(data);
  };

  const signin = async (data: SigninData): Promise<StoreProfile> => {
    return signinMutation.mutateAsync(data);
  };

  const signout = async (): Promise<void> => {
    await signoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        signup,
        signin,
        signout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
