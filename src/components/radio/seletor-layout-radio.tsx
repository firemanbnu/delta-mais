import { Columns3, Rows3 } from "lucide-react";

import { BotaoLink } from "@/components/ui/link-button";
import type { LayoutRadio } from "@/lib/radio";

/** Endereço da folha com o modelo do rádio escolhido (horizontal é o padrão). */
function comLayoutRadio(caminho: string, layout: LayoutRadio): string {
  return `${caminho}${layout === "vertical" ? "?radio=vertical" : ""}`;
}

/**
 * Troca entre as duas formas da grade de rádio na folha impressa. Fica na
 * barra de cima da folha, que não sai no papel.
 */
export function SeletorLayoutRadio({ caminho, atual }: { caminho: string; atual: LayoutRadio }) {
  return (
    <div className="sem-impressao flex items-center gap-1" role="group" aria-label="Modelo da escala de rádio">
      <BotaoLink
        size="sm"
        variant={atual === "horizontal" ? "default" : "outline"}
        href={comLayoutRadio(caminho, "horizontal")}
        aria-current={atual === "horizontal" ? "true" : undefined}
      >
        <Rows3 data-icon="inline-start" />
        Datas nas linhas
      </BotaoLink>
      <BotaoLink
        size="sm"
        variant={atual === "vertical" ? "default" : "outline"}
        href={comLayoutRadio(caminho, "vertical")}
        aria-current={atual === "vertical" ? "true" : undefined}
      >
        <Columns3 data-icon="inline-start" />
        Datas nas colunas
      </BotaoLink>
    </div>
  );
}
