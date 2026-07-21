import * as importRepo from "@/server/repositories/import.repository";

export function listImports(take?: number) {
  return importRepo.listImports(take);
}
