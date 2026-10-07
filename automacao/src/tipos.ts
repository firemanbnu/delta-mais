import { z } from "zod";

import {
  payloadDetectarSchema,
  payloadPosicionarSchema,
  resultadoPosicionarSchema,
  type PayloadDetectar,
  type PayloadPosicionar,
} from "../../src/lib/automacao";

export const comandoSchema = z.object({
  id: z.number().int().positive(),
  tipo: z.enum(["CONECTAR", "DETECTAR", "POSICIONAR", "FECHAR"]),
});

export const comandoDetectarSchema = comandoSchema.extend({
  payload: payloadDetectarSchema.nullable(),
});

export const comandoPosicionarSchema = comandoSchema.extend({
  payload: payloadPosicionarSchema.nullable(),
});

export type ComandoRetomado = z.infer<typeof comandoSchema> & {
  payload: PayloadDetectar | PayloadPosicionar | null;
};

export const relatorioPosicionarSchema = resultadoPosicionarSchema;

export { payloadDetectarSchema, payloadPosicionarSchema };