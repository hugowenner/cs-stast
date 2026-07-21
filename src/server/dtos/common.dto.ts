import { z } from "zod";

export const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
