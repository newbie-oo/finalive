import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { listPendingSlips, type SlipQueueStatus } from "@/server/repos/slip";

const STATUS_VALUES = [
  "submitted",
  "accepted",
  "rejected",
  "all",
] as const satisfies readonly SlipQueueStatus[];
const querySchema = z.object({
  status: z.enum(STATUS_VALUES).default("submitted"),
  cursor: z.string().optional(),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = apiRoute({
  auth: "admin",
  query: querySchema,
  handler: async ({ query }) => listPendingSlips(query),
});
