import { z } from 'zod';

const markConversationReadBodySchema = z
  .object({
    throughSequence: z.number().int().min(1),
  })
  .strict();

type MarkConversationReadBody = z.infer<typeof markConversationReadBodySchema>;

export default markConversationReadBodySchema;
export type { MarkConversationReadBody };
