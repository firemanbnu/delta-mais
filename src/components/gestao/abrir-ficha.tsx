"use client";

import { useRouter } from "next/navigation";
import { FileUser } from "lucide-react";

import { CLASSE_SELECT } from "./comum";

/** Seletor para abrir a ficha individual de documentos de uma pessoa. */
export function AbrirFicha({ pessoas }: { pessoas: { id: number; nome: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <FileUser className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">Abrir ficha individual</span>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) router.push(`/gestao/documentos/${e.target.value}`);
        }}
        className={`${CLASSE_SELECT} max-w-72`}
      >
        <option value="">Abrir ficha individual…</option>
        {pessoas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
