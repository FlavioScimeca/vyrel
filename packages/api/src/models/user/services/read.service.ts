import type { UserTypeById } from "../types/extra.types";
import { fetchCurrentUser, fetchUser } from "../utils/auth-api";

export const getUser = (input: UserTypeById, actorUserId: string) =>
  fetchUser(input.id, actorUserId);

export const getCurrentUser = (actorUserId: string) =>
  fetchCurrentUser(actorUserId);
