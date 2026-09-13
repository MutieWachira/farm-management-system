export type FarmRole =
  | "OWNER"
  | "MANAGER"
  | "WORKER"
  | "VIEWER";

export interface FarmMember {
  id: string;
  farm_id: string;
  user_id: string;
  role: FarmRole;
  joined_at: string;
  email: string;
}

export interface AddFarmMemberRequest {
  email: string;
  role: FarmRole;
}

export interface UpdateFarmMemberRequest {
  role: FarmRole;
}