import { notFound } from "next/navigation";

import { montarEscala, montarEscalaRadio, semearOperadoresRadio, semearPostos } from "@/db/repositorio";
import { DIAS_SEMANA, formatarDataBR } from "@/lib/calendario";
import { montarCsv } from "@/lib/csv";
import { SLOTS_RADIO } from "@/lib/radio";

export const dynamic = "force-dynamic";

/**
 * Baixa a escala de rádio do mês: uma linha por noite e por faixa, com o
 * operador automático ou a troca manual. Sai separado do CSV do plantão para
 * não mudar o formato que a unidade já consome.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/escala/[ano]/[mes]/exportar/radio">,
) {
  const { ano, mes } = await ctx.params;
  const anoNum = Number(ano);
  const mesNum = Number(mes);

  if (!Number.isInteger(anoNum) || !Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
    notFound();
  }

  await Promise.all([semearPostos(), semearOperadoresRadio()]);
  const escala = await montarEscala({ ano: anoNum, mes: mesNum });
  if (!escala) notFound();

  const radio = await montarEscalaRadio({ ano: anoNum, mes: mesNum }, escala);
  if (!radio) notFound();

  const linhas = radio.noites.flatMap((noite) => {
    const dia = new Date(`${noite.data}T12:00:00`);

    return SLOTS_RADIO.map((slot) => {
      const celula = noite.slots[slot.id];
      const fixo = slot.bloco === "FIXO";
      const nome = fixo
        ? (radio.comunicacao?.nome ?? "")
        : celula
          ? (radio.nomesPorId[celula.pessoaId] ?? "")
          : "";

      return [
        formatarDataBR(noite.data),
        DIAS_SEMANA[dia.getDay()],
        noite.indice,
        slot.inicio,
        slot.fim,
        nome,
        fixo ? "F3-BA2" : "",
        fixo ? "fixa" : celula?.origem === "MANUAL" ? "manual" : "rodízio",
      ];
    });
  });

  const csv = montarCsv(
    ["Data", "Dia", "Noite", "Início", "Fim", "Operador", "Posto", "Origem"],
    linhas,
  );

  const mesArquivo = `${anoNum}-${String(mesNum).padStart(2, "0")}`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="radio-${mesArquivo}.csv"`,
      "cache-control": "no-store",
    },
  });
}
