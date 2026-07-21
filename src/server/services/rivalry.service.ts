import * as rivalryRepo from "@/server/repositories/rivalry.repository";

export function listTopRivalries(take?: number) {
  return rivalryRepo.listTopRivalries(take);
}
