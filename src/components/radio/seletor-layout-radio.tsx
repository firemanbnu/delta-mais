import { Columns3, Rows3 } from "lucide-react";

import { BotaoLink } from "@/components/ui/link-button";
import type { LayoutRadio } from "@/lib/radio";

/** Endereço da página com o modelo do rádio escolhido (horizontal é o padrão). */
export function comLayoutRadio(caminho: string, layout: LayoutRadio, ancora = ""): string {
  return `${caminho}${layout === "vertical" ? "?radio=vertical" : ""}${ancora}`;
}

/**
 * Troca entre as duas formas da grade de rádio. É um link, não um estado da
 * tela, para a impressão abrir no mesmo modelo.
 */
export function SeletorLayoutRadio({
  caminho,
  atual,
  ancora = "",
}: {
  caminho: string;
  atual: LayoutRadio;
  ancora?: string;
}) {
  return (
    <div className="sem-impressao flex items-center gap-1" role="group" aria-label="Modelo da escala de rádio">
      <BotaoLink
        size="sm"
        variant={atual === "horizontal" ? "default" : "outline"}
        href={comLayoutRadio(caminho, "horizontal", ancora)}
        aria-current={atual === "horizontal" ? "true" : undefined}
      >
        <Rows3 data-icon="inline-start" />
        Datas nas linhas
      </BotaoLink>
      <BotaoLink
        size="sm"
        variant={atual === "vertical" ? "default" : "outline"}
        href={comLayoutRadio(caminho, "vertical", ancora)}
        aria-current={atual === "vertical" ? "true" : undefined}
      >
        <Columns3 data-icon="inline-start" />
        Datas nas colunas
      </BotaoLink>
    </div>
  );
}
