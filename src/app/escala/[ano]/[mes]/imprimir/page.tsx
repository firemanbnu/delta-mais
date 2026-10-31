import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { BotaoImagemEscala } from "@/components/escala/botao-imagem-escala";
import { BotaoImprimir } from "@/components/escala/botao-imprimir";
import { SeletorLayoutRadio } from "@/components/radio/seletor-layout-radio";
import { BotaoLink } from "@/components/ui/link-button";
import {
  buscarPeriodo,
  lerConfiguracoes,
  montarEscala,
  montarEscalaAbastecimento,
  montarEscalaFaxina,
  montarEscalaRadio,
  semearOperadoresRadio,
  type EscalaRadio,
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
import { SLOTS_RADIO, layoutRadioDe, type NoiteDeRadio, type SlotRadio } from "@/lib/radio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Imprimir escala" };

export default async function PaginaImprimir({
  params,
  searchParams,
}: PageProps<"/escala/[ano]/[mes]/imprimir">) {
  const { ano, mes } = await params;
  const layoutRadio = layoutRadioDe((await searchParams).radio);
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

  const [radio, faxina, abastecimento] = await Promise.all([
    montarEscalaRadio({ ano: anoNum, mes: mesNum }, escala),
    montarEscalaFaxina({ ano: anoNum, mes: mesNum }, escala),
    montarEscalaAbastecimento({ ano: anoNum, mes: mesNum }, escala),
  ]);

  const nomesPorId = new Map(escala.pessoas.map((p) => [p.id, p]));
  const unidades: Unidade[] = ["F2", "F3", "CRS"];
  const dias = diasDoMes(anoNum, mesNum);
  const primeiroDia = DIAS_SEMANA[dias[0].getDay()];
  const ultimoDia = DIAS_SEMANA[dias[dias.length - 1].getDay()];
  const inicio = String(config.turnoInicio).slice(0, 5);
  const fim = String(config.turnoFim).slice(0, 5);
  const caminho = `/escala/${anoNum}/${String(mesNum).padStart(2, "0")}`;

  return (
    <div className="folha-impressao mx-auto max-w-6xl px-4 py-6">
      <div className="sem-impressao mb-6 flex flex-wrap items-center justify-between gap-4">
        <BotaoLink variant="ghost" size="sm" href={caminho}>
          <ArrowLeft data-icon="inline-start" />
          Voltar para a escala
        </BotaoLink>
        <div className="flex flex-wrap items-center gap-2">
          {radio && radio.noites.length > 0 ? (
            <SeletorLayoutRadio caminho={`${caminho}/imprimir`} atual={layoutRadio} />
          ) : null}
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
          <BotaoImagemEscala
            key={layoutRadio}
            alvoId="folha-escala"
            nomeArquivo={`escala-${anoNum}-${String(mesNum).padStart(2, "0")}.png`}
            titulo={`Escala ${rotuloMesCurto(anoNum, mesNum)}`}
          />
          <BotaoImprimir />
        </div>
      </div>

      <p className="sem-impressao mb-4 text-sm text-muted-foreground">
        Para gerar o arquivo, escolha <strong>Salvar como PDF</strong> como destino da impressão. A
        folha sai numa página A4 em pé. Para mandar no WhatsApp, use <strong>Gerar imagem</strong>.
      </p>

      <div id="folha-escala">
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

          <section className="grade-viaturas mt-5 grid gap-6 sm:grid-cols-3">
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
                        const cobertura = escala.coberturas[posto.codigo];
                        return (
                          <tr key={posto.codigo} className="border-b border-black/30 last:border-0">
                            <td className="w-14 px-2 py-1 align-top font-mono text-xs">
                              {posto.rotulo}
                            </td>
                            <td className="px-2 py-1">
                              {cobertura ? (
                                <>
                                  <span className="font-semibold">{cobertura.nome}</span>
                                  <span className="ml-1">
                                    ({cobertura.funcao ?? "ferista"})
                                  </span>
                                  <span className="block text-xs italic">
                                    titular: {pessoa?.nome ?? "—"} · {cobertura.descricao}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold">{pessoa?.nome ?? "—"}</span>
                                  {pessoa ? <span className="ml-1">({pessoa.funcao})</span> : null}
                                </>
                              )}
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
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
  <p className="mt-2 text-xs">
              Noites pintadas: equipe de serviço ({inicio} às {fim}). Nas demais, a equipe folga.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase">
              Faxina{abastecimento.length > 0 ? " e abastecimento" : ""}
            </h2>
            <table className="mt-2 w-full table-fixed border-collapse text-xs">
              <tbody>
                {[faxina.slice(0, 5), faxina.slice(5), abastecimento]
                  .filter((linha) => linha.length > 0)
                  .map((linha, indice) => (
                  <tr key={indice}>
                    {linha.map((celula) => (
                      <td key={celula.local.id} className="border border-black px-1 py-1 align-top">
                        <span className="block text-[9px] uppercase">{celula.local.rotulo}</span>
                        <span className={`font-bold uppercase ${celula.cobertura ? "italic" : ""}`}>
                          {celula.cobertura ? `${celula.cobertura.nome}*` : celula.nome}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {[...faxina, ...abastecimento].some((celula) => celula.cobertura) ? (
              <p className="mt-1 text-xs">
                * ferista:{" "}
                {[
                  ...new Set(
                    [...faxina, ...abastecimento]
                      .filter((celula) => celula.cobertura)
                      .map((celula) => `${celula.cobertura?.nome} no lugar de ${celula.nome}`),
                  ),
                ].join("; ")}
              </p>
            ) : null}
          </section>
        </article>

        {radio && radio.noites.length > 0 ? (
          <article className="impressao mx-auto mt-6 max-w-6xl rounded-xl border bg-white p-8 text-black">
            <header className="border-b-2 border-black pb-3">
              <h1 className="text-xl font-bold uppercase tracking-wide">Escala de Rádio</h1>
              <p className="mt-1 text-sm">
                {rotuloMesCurto(anoNum, mesNum)} · {radio.noites.length} noites de rádio ·{" "}
                {radio.config.radioAncora ? formatarDataBR(radio.config.radioAncora) : ""} até o fim
                da escala
              </p>
            </header>

            {layoutRadio === "vertical" ? (
              quinzenas(radio.noites).map((noites, indice, todas) => (
                <TabelaRadioVertical
                  key={indice}
                  noites={noites}
                  colunas={Math.max(...todas.map((q) => q.length))}
                  radio={radio}
                />
              ))
            ) : (
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
                  {radio.noites.map((noite, indice) => (
                    <tr key={noite.data} className={faixaImpressa(indice)}>
                      <td className="border border-black px-1 py-0.5 font-mono">
                        {formatarDataBR(noite.data)}
                      </td>
                      {SLOTS_RADIO.map((slot) => (
                        <CelulaImpressaRadio key={slot.id} noite={noite} slot={slot} radio={radio} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Divide as noites do mês em duas quinzenas (dias 1 a 15 e 16 até o fim), uma
 * tabela embaixo da outra, para a grade vertical caber na largura da folha.
 */
function quinzenas(noites: NoiteDeRadio[]): NoiteDeRadio[][] {
  const dia = (noite: NoiteDeRadio) => Number(noite.data.slice(8, 10));
  return [noites.filter((n) => dia(n) <= 15), noites.filter((n) => dia(n) > 15)].filter(
    (q) => q.length > 0,
  );
}

/**
 * Grade de rádio com as datas nas colunas e os horários nas linhas. As duas
 * quinzenas usam o mesmo número de colunas para ficarem alinhadas; a que tem
 * menos noites ganha colunas vazias no fim.
 */
function TabelaRadioVertical({
  noites,
  colunas,
  radio,
}: {
  noites: NoiteDeRadio[];
  colunas: number;
  radio: EscalaRadio;
}) {
  const vazias = Array.from({ length: colunas - noites.length }, (_, i) => i);
  return (
    <table className="mt-3 w-full table-fixed border-collapse text-[9px] leading-tight">
      <thead>
        <tr>
          <th className="w-[11mm] border border-black px-0.5 py-0.5 text-left font-bold">
            Horário
          </th>
          {noites.map((noite) => (
            <th key={noite.data} className="border border-black px-0.5 py-0.5 font-normal">
              <span className="block font-bold">{formatarDataBR(noite.data).slice(0, 5)}</span>
              {DIAS_SEMANA_CURTO[new Date(`${noite.data}T12:00:00`).getDay()]}
            </th>
          ))}
          {vazias.map((i) => (
            <th key={`vazia-${i}`} aria-hidden />
          ))}
        </tr>
      </thead>
      <tbody>
        {SLOTS_RADIO.map((slot, indice) => (
          <tr key={slot.id}>
            <td className={`border border-black px-0.5 py-0.5 font-mono ${faixaImpressa(indice)}`}>
              {slot.inicio}–{slot.fim}
            </td>
            {noites.map((noite) => (
              <CelulaImpressaRadio
                key={noite.data}
                noite={noite}
                slot={slot}
                radio={radio}
                faixa={faixaImpressa(indice)}
                compacta
              />
            ))}
            {vazias.map((i) => (
              <td key={`vazia-${i}`} aria-hidden />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Linhas alternadas na folha: uma branca, a seguinte laranja clarinho. */
function faixaImpressa(indice: number): string {
  return indice % 2 === 1 ? "bg-orange-100" : "bg-white";
}

/** Uma faixa de uma noite na folha impressa; igual nos dois modelos. */
function CelulaImpressaRadio({
  noite,
  slot,
  radio,
  compacta = false,
  faixa = "",
}: {
  noite: NoiteDeRadio;
  slot: SlotRadio;
  radio: EscalaRadio;
  /** Cor da linha aplicada na própria célula (grade vertical). */
  faixa?: string;
  /** Modelo vertical: colunas estreitas, sem espaço lateral e texto centralizado. */
  compacta?: boolean;
}) {
  const base = `border border-black py-0.5 ${faixa} ${compacta ? "px-0.5 text-center" : "px-0.5"}`;
  if (slot.bloco === "FIXO") {
    return (
      <td className={`${base} text-center font-semibold`}>
        {radio.comunicacao?.nome ?? "—"}
      </td>
    );
  }
  const celula = noite.slots[slot.id];
  return (
    <td
      className={`${base} ${celula?.origem === "MANUAL" ? "font-semibold" : ""} ${
        celula?.cobertura ? "italic" : ""
      }`}
    >
      {celula
        ? celula.cobertura
          ? `${celula.cobertura.nome}*`
          : (radio.nomesPorId[celula.pessoaId] ?? "—")
        : "—"}
    </td>
  );
}
