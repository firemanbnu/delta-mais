"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";

import { entrarGestaoAction } from "@/app/acoes/gestao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormEntrar() {
  const [estado, enviar, pendente] = useActionState(entrarGestaoAction, null);

  return (
    <form action={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha da Gestão</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {estado && !estado.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pendente}>
        <LockKeyhole data-icon="inline-start" />
        {pendente ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
