import { z } from "zod";

export const setConfigSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
