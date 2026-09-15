import { apiRequest } from "./api";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from "@/src/types/auth";

export function register(
  data: RegisterRequest,
): Promise<User> {
  return apiRequest<User>(
    "/api/v1/auth/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function login(
  data: LoginRequest,
): Promise<TokenResponse> {
  return apiRequest<TokenResponse>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function getCurrentUser(
  accessToken: string,
): Promise<User> {
  return apiRequest<User>(
    "/api/v1/auth/me",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}