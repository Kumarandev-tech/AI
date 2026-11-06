
import { z } from "zod";

export const agentResponseSchema = z.object({
  text: z.string().default(""),
  summary: z.string().optional(),
  actions: z
    .array(
      z.object({
        label: z.string(),
        prompt: z.string(),
      })
    )
    .default([]),
});

export function validateAgentResponse(value) {
  return agentResponseSchema.parse(value);
}
