import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { BotaoImprimir } from "@/components/escala/botao-imprimir";
import { BotaoLink } from "@/components/ui/link-button";
import {
  buscarPeriodo,
  lerConfiguracoes,
  montarEscala,
  montarEscalaRadio,
  semearOperadoresRadio,
  semearPostos,
} from "@/db/repositorio";
import { ROTULO_UNIDADE, type Unidade } from "@/lib/dominio";
import {
  DIAS_SEMANA,
  DIAS_SEMANA_CURTO,
  diasDoMes,
  ehNoiteDeServico,
  formatarDataBR,
  paraISO,
  rotuloMesCurto,
} from "@/lib/calendario";
import { SLOTS_RADIO, resumoDaRegra } from "@/lib/radio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Imprimir escala" };

export default async function PaginaImprimir({
  params,
}: PageProps<"/escala/[ano]/[mes]/imprimir">) {
  const { ano, mes } = await params;
  const anoNum = Number(ano);
  const mesNum = Number(mes);

  if (!Number.isInteger(anoNum) || !Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
    notFound();
  }

  await Promise.all([semearPostos(), semearOperadoresRadio()]);
  const periodo = await buscarPeriodo({ ano: anoNum, mes: mesNum });
  if (!periodo) notFound();

  const [escala, config] = await Promise.all([
    montarEscala({ ano: anoNum, mes: mesNum }),
    lerConfiguracoes(),
  ]);
  if (!escala) notFound();

  const radio = await montarEscalaRadio({ ano: anoNum, mes: mesNum }, escala);

  const nomesPorId = new Map(escala.pessoas.map((p) => [p.id, p]));
  const unidades: Unidade[] = ["F2", "F3", "CRS"];
  const dias = diasDoMes(anoNum, mesNum);
  const primeiroDia = DIAS_SEMANA[dias[0].getDay()];
  const ultimoDia = DIAS_SEMANA[dias[dias.length - 1].getDay()];
  const inicio = String(config.turnoInicio).slice(0, 5);
  const fim = String(config.turnoFim).slice(0, 5);
  const caminho = `/escala/${anoNum}/${String(mesNum).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="sem-impressao mb-6 flex items-center justify-between gap-4">
        <BotaoLink variant="ghost" size="sm" href={caminho}>
          <ArrowLeft data-icon="inline-start" />
          Voltar para a escala
        </BotaoLink>
        <div className="flex items-center gap-2">
          {radio && radio.noites.length > 0 ? (
            <BotaoLink variant="outline" size="sm" href={`${caminho}/exportar/radio`}>
              <Download data-icon="inline-start" />
              CSV do rádio
            </BotaoLink>
          ) : null}
          <BotaoLink variant="outline" size="sm" href={`${caminho}/exportar`}>
            <Download data-icon="inline-start" />
            Baixar CSV
          </BotaoLink>
          <BotaoImprimir />
        </div>
      </div>

      <p className="sem-impressao mb-4 text-sm text-muted-foreground">
        Para gerar o arquivo, escolha <strong>Salvar como PDF</strong> como destino da impressão. A
        folha sai em A4 paisagem.
      </p>

      <article className="impressao rounded-xl border bg-white p-8 text-black">
        <header className="border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold uppercase tracking-wide">
            Escala de Serviço — Plantão Noturno
          </h1>
          <p className="mt-1 text-sm">
{rotuloMesCurto(anoNum, mesNum)} · {primeiroDia} a {ultimoDia} · Plantão das{" "}
            {inicio} às {fim} (12x36)
          </p>
        </header>

        {escala.problemas.filter((p) => p.severidade === "erro").length > 0 ? (
          <section className="mt-4 border border-black p-3 text-sm">
            <h2 className="font-bold">Escala incompleta — corrigir antes de distribuir</h2>
            <ul className="mt-1 list-disc pl-5">
              {escala.problemas
                .filter((p) => p.severidade === "erro")
                .map((problema) => (
                  <li key={problema.mensagem}>{problema.mensagem}</li>
                ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-5 grid gap-6 sm:grid-cols-3">
          {unidades.map((unidade) => {
            const vagas = escala.postos.filter((p) => p.unidade === unidade);
            return (
              <div key={unidade} className="border border-black">
                <h2 className="border-b border-black bg-black px-2 py-1 text-sm font-bold uppercase text-white">
                  {ROTULO_UNIDADE[unidade]}
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    {vagas.map((posto) => {
                      const pessoaId = escala.estado[posto.codigo];
                      const pessoa = pessoaId ? nomesPorId.get(pessoaId) : null;
                      return (
                        <tr key={posto.codigo} className="border-b border-black/30 last:border-0">
                          <td className="w-14 px-2 py-1 align-top font-mono text-xs">
                            {posto.rotulo}
                          </td>
                          <td className="px-2 py-1">
                            <span className="font-semibold">{pessoa?.nome ?? "—"}</span>
                            {pessoa ? <span className="ml-1">({pessoa.funcao})</span> : null}
                            {posto.comunicacao ? (
                              <span className="block text-xs italic">
                                também na central de comunicações
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase">Noites de serviço</h2>
          <table className="mt-2 w-full border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="border border-black px-1 py-1 font-bold">Dia</th>
                {dias.map((dia) => (
                  <th key={paraISO(dia)} className="border border-black px-1 py-1 font-normal">
                    {DIAS_SEMANA_CURTO[dia.getDay()]}
                    <span className="block font-bold">{dia.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="border border-black px-1 py-1 text-left font-bold">Plantão</th>
                {dias.map((dia) => (
                  <td
key={paraISO(dia)}
                    className={`border border-black px-1 py-1 ${
                      ehNoiteDeServico(dia, config.dataAncora, config.noiteDeServico)
                        ? "bg-black font-bold text-white"
                        : "text-neutral-400"
                    }`}
                  >
                    {ehNoiteDeServico(dia, config.dataAncora, config.noiteDeServico) ? "●" : "○"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
<p className="mt-2 text-xs">
            ● noite de serviço ({inicio} às {fim}) · a equipe folga nas noites marcadas com ○
          </p>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="mb-6">Responsável pela escala</p>
            <div className="border-t border-black pt-1">Nome e assinatura</div>
          </div>
          <div>
            <p className="mb-6">Comandante do plantão</p>
            <div className="border-t border-black pt-1">Nome e assinatura</div>
          </div>
        </section>
      </article>

      {radio && radio.noites.length > 0 ? (
        <article className="impressao quebra-folha mx-auto mt-6 max-w-6xl rounded-xl border bg-white p-8 text-black">
          <header className="border-b-2 border-black pb-3">
            <h1 className="text-xl font-bold uppercase tracking-wide">Escala de Rádio</h1>
            <p className="mt-1 text-sm">
              {rotuloMesCurto(anoNum, mesNum)} · {radio.noites.length} noites de rádio ·{" "}
              {radio.config.radioAncora ? formatarDataBR(radio.config.radioAncora) : ""} até o fim
              da escala
            </p>
          </header>

          <p className="mt-2 text-xs">{resumoDaRegra()}</p>

          <table className="mt-3 w-full border-collapse text-[9px]">
            <thead>
              <tr>
                <th className="w-16 border border-black px-1 py-0.5 text-left font-bold">Noite</th>
                {SLOTS_RADIO.map((slot) => (
                  <th key={slot.id} className="border border-black px-0.5 py-0.5 font-normal">
                    {slot.inicio}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {radio.noites.map((noite) => (
                <tr key={noite.data}>
                  <td className="border border-black px-1 py-0.5 font-mono">
                    {formatarDataBR(noite.data)}
                    <span className="block text-[8px]">nº {noite.indice}</span>
                  </td>
                  {SLOTS_RADIO.map((slot) => {
                    if (slot.bloco === "FIXO") {
                      return (
                        <td
                          key={slot.id}
                          className="border border-black bg-neutral-100 px-0.5 py-0.5 text-center font-semibold"
                        >
                          {radio.comunicacao?.nome ?? "—"}
                        </td>
                      );
                    }
                    const celula = noite.slots[slot.id];
                    return (
                      <td
                        key={slot.id}
                        className={`border border-black px-0.5 py-0.5 ${
                          celula?.origem === "MANUAL" ? "bg-neutral-200 font-semibold" : ""
                        }`}
                      >
                        {celula ? (radio.nomesPorId[celula.pessoaId] ?? "—") : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 text-xs">
            Célula cinza: troca manual. A entrada e a saída da central (19:00 e 06:00) ficam com o
            bombeiro escalado no F3-BA2.
          </p>

          <section className="mt-8 grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="mb-6">Responsável pela escala de rádio</p>
              <div className="border-t border-black pt-1">Nome e assinatura</div>
            </div>
            <div>
              <p className="mb-6">Coordenador da comunicação</p>
              <div className="border-t border-black pt-1">Nome e assinatura</div>
            </div>
          </section>
        </article>
      ) : null}
    </div>
  );
}
