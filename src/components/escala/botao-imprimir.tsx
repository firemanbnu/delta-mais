"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BotaoImprimir() {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer data-icon="inline-start" />
      Imprimir ou salvar em PDF
    </Button>
  );
}
