import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Download,
  Info,
  Printer,
  TriangleAlert,
} from "lucide-react";

import { BarraAcoes } from "@/components/escala/barra-acoes";
import { CelulaVaga } from "@/components/escala/celula-vaga";
import { BotaoRestaurarRadio } from "@/components/radio/botao-restaurar-radio";
import { GradeRadio } from "@/components/radio/grade-radio";
import { Badge } from "@/components/ui/badge";
import { BotaoLink } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PeriodoAnterior,
  buscarPeriodo,
  lerConfiguracoes,
  listarPeriodos,
  montarEscala,
  montarEscalaRadio,
  semearOperadoresRadio,
  semearPostos,
} from "@/db/repositorio";
import { ROTULO_UNIDADE, type Unidade } from "@/lib/dominio";
import {
  DIAS_SEMANA_CURTO,
  ehNoiteDeServico,
  formatarDataBR,
  mesAnterior,
  mesSeguinte,
  noitesDeServicoNoMes,
  paraISO,
  rotuloMesCurto,
} from "@/lib/calendario";
import { resumoDaRegra } from "@/lib/radio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Escala do mês" };

export default async function PaginaEscala({ params }: PageProps<"/escala/[ano]/[mes]">) {
  const { ano, mes } = await params;
  const anoNum = Number(ano);
  const mesNum = Number(mes);

  if (!Number.isInteger(anoNum) || !Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
    notFound();
  }

  await Promise.all([semearPostos(), semearOperadoresRadio()]);

  const [periodo, config, todosPeriodos] = await Promise.all([
    buscarPeriodo({ ano: anoNum, mes: mesNum }),
    lerConfiguracoes(),
    listarPeriodos(),
  ]);

  if (!periodo) {
    return <MesInexistente ano={anoNum} mes={mesNum} existeAlgum={todosPeriodos.length > 0} />;
  }

  const escala = await montarEscala({ ano: anoNum, mes: mesNum });
  if (!escala) notFound();

  const radio = await montarEscalaRadio({ ano: anoNum, mes: mesNum }, escala);

  const anterior = await PeriodoAnterior({ ano: anoNum, mes: mesNum });
  const noites = noitesDeServicoNoMes(anoNum, mesNum, config.dataAncora, config.noiteDeServico);
  const erros = escala.problemas.filter((p) => p.severidade === "erro");
  const avisos = escala.problemas.filter((p) => p.severidade === "aviso");

  const errosRadio = (radio?.problemas ?? []).filter((p) => p.severidade === "erro");
  const avisosRadio = (radio?.problemas ?? []).filter((p) => p.severidade === "aviso");
  const trocasManuais =
    radio?.noites.reduce(
      (total, noite) =>
        total + Object.values(noite.slots).filter((celula) => celula.origem === "MANUAL").length,
      0,
    ) ?? 0;

  const nomesPorId = new Map(escala.pessoas.map((p) => [p.id, p]));
  const idsOcupadosPorPosto = new Map(
    escala.postos.map((posto) => [
      posto.codigo,
      Object.entries(escala.estado)
        .filter(([codigo, pessoaId]) => codigo !== posto.codigo && pessoaId)
        .map(([, pessoaId]) => pessoaId as string),
    ]),
  );

  const unidades: Unidade[] = ["F2", "F3", "CRS"];
  const caminho = (a: number, m: number) => `/escala/${a}/${String(m).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Escala de serviço · plantão noturno</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {rotuloMesCurto(anoNum, mesNum)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={periodo.status === "PUBLICADO" ? "default" : "secondary"}>
              {periodo.status === "PUBLICADO" ? "Publicada" : "Rascunho"}
            </Badge>
            <span>
              {String(config.turnoInicio).slice(0, 5)} às {String(config.turnoFim).slice(0, 5)} ·
              12x36
            </span>
            <span aria-hidden>·</span>
            <span>
              {noites.length} {noites.length === 1 ? "noite de serviço" : "noites de serviço"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <BotaoLink
              variant="outline"
              size="icon"
              aria-label="Mês anterior"
              href={caminho(...mesObject(mesAnterior({ ano: anoNum, mes: mesNum })))}
            >
              <ChevronLeft />
            </BotaoLink>
            <BotaoLink
              variant="outline"
              size="icon"
              aria-label="Próximo mês"
              href={caminho(...mesObject(mesSeguinte({ ano: anoNum, mes: mesNum })))}
            >
              <ChevronRight />
            </BotaoLink>
          </div>

          <BotaoLink
            variant="outline"
            size="sm"
            href={`${caminho(anoNum, mesNum)}/imprimir`}
          >
            <Printer data-icon="inline-start" />
            Imprimir / PDF
          </BotaoLink>

          <BotaoLink
            variant="outline"
            size="sm"
            href={`${caminho(anoNum, mesNum)}/exportar`}
          >
            <Download data-icon="inline-start" />
            CSV
          </BotaoLink>

          <BarraAcoes
            ano={anoNum}
            mes={mesNum}
            status={periodo.status}
            existeMesAnterior={Boolean(anterior)}
            rotuloMesAnterior={
              anterior ? rotuloMesCurto(anterior.ano, anterior.mes) : "—"
            }
            bloqueadoPorErros={erros.length > 0}
          />
        </div>
      </header>

      {erros.length > 0 || avisos.length > 0 ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          {erros.length > 0 ? (
            <Avisos titulo="Erros que impedem a publicação" itens={erros} variante="erro" />
          ) : null}
          {avisos.length > 0 ? (
            <Avisos titulo="Atenção" itens={avisos} variante="aviso" />
          ) : null}
        </section>
      ) : (
        <p className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          <CircleCheck className="size-4 text-emerald-500" aria-hidden />
          Escala completa e consistente: 10 vagas preenchidas com a qualificação correta.
        </p>
      )}

      <section className="mt-6 space-y-5">
        {unidades.map((unidade) => {
          const vagas = escala.postos.filter((p) => p.unidade === unidade);
          return (
            <article key={unidade} className="rounded-xl border bg-card">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <h2 className="font-semibold">{ROTULO_UNIDADE[unidade]}</h2>
                <span className="text-sm text-muted-foreground">
                  {vagas.length} {vagas.length === 1 ? "vaga" : "vagas"}
                </span>
              </header>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Vaga</TableHead>
                    <TableHead>Bombeiro escalado</TableHead>
                    <TableHead className="w-28 text-right">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vagas.map((posto) => {
                    const pessoaId = escala.estado[posto.codigo];
                    const pessoa = pessoaId ? nomesPorId.get(pessoaId) : null;
                    const ausente = Boolean(pessoaId && escala.ausentes.includes(pessoaId));
                    const origem = escala.origens[posto.codigo] ?? "MANUAL";

                    return (
                      <TableRow key={posto.codigo}>
                        <TableCell className="font-mono text-xs">
                          {posto.codigo}
                          <span className="ml-1 text-muted-foreground">{posto.rotulo}</span>
                        </TableCell>
                        <TableCell>
                          <CelulaVaga
                            ano={anoNum}
                            mes={mesNum}
                            posto={posto}
                            pessoaId={pessoaId}
                            origem={origem}
                            pessoas={escala.pessoas}
                            ausentes={escala.ausentes}
                            nomesOcupados={idsOcupadosPorPosto.get(posto.codigo) ?? []}
                          />
                          {posto.comunicacao ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Info className="size-3" aria-hidden />
                              vaga também atende a central de comunicações
                            </p>
                          ) : null}
                          {ausente && pessoa ? (
                            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              {pessoa.nome} consta como ausente neste mês.
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          {origem === "MANUAL" ? (
                            <Badge variant="outline" className="text-xs">
                              manual
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              rodízio
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </article>
          );
        })}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Noites de serviço do mês</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A equipe entra às {String(config.turnoInicio).slice(0, 5)} e sai às{" "}
          {String(config.turnoFim).slice(0, 5)} do dia seguinte. Uma noite de serviço, uma de
          folga.
        </p>

        <ol className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: new Date(anoNum, mesNum, 0).getDate() }, (_, i) => {
            const dia = new Date(anoNum, mesNum - 1, i + 1, 12);
            const servico = ehNoiteDeServico(dia, config.dataAncora, config.noiteDeServico);
            return (
              <li
                key={paraISO(dia)}
                className={`flex size-11 flex-col items-center justify-center rounded-md border text-xs ${
                  servico
                    ? "border-orange-500/50 bg-orange-500/15 font-medium"
                    : "border-border text-muted-foreground"
                }`}
              >
                <span className="text-[10px] uppercase opacity-70">
                  {DIAS_SEMANA_CURTO[dia.getDay()]}
                </span>
                <span className="text-sm">{i + 1}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {radio && radio.noites.length > 0 ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Escala de rádio</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{resumoDaRegra()}</p>
            </div>

            <div className="sem-impressao flex flex-wrap items-center gap-2">
              {trocasManuais > 0 ? <BotaoRestaurarRadio ano={anoNum} mes={mesNum} /> : null}
              <BotaoLink variant="outline" size="sm" href={`${caminho(anoNum, mesNum)}/exportar/radio`}>
                <Download data-icon="inline-start" />
                CSV do rádio
              </BotaoLink>
            </div>
          </div>

          {errosRadio.length > 0 || avisosRadio.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {errosRadio.length > 0 ? (
                <Avisos titulo="Erros na escala de rádio" itens={errosRadio} variante="erro" />
              ) : null}
              {avisosRadio.length > 0 ? (
                <Avisos titulo="Atenção" itens={avisosRadio} variante="aviso" />
              ) : null}
            </div>
          ) : null}

          <div className="mt-4">
            <GradeRadio
              ano={anoNum}
              mes={mesNum}
              noites={radio.noites}
              operadores={radio.operadores.map((operador) => ({
                id: operador.id,
                nome: operador.nome,
                anel: operador.anel,
              }))}
              ausentes={radio.ausentes}
              comunicacao={radio.comunicacao}
            />
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <h2 className="font-semibold">Escala de rádio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Este mês ainda não entrou na escala de rádio. Ela começa em{" "}
            {formatarDataBR(radio?.config.radioAncora ?? config.radioAncora)} e mostra apenas as
            noites de serviço do plantão.
          </p>
        </section>
      )}
    </div>
  );
}

function mesObject(periodo: { ano: number; mes: number }): [number, number] {
  return [periodo.ano, periodo.mes];
}

function Avisos({
  titulo,
  itens,
  variante,
}: {
  titulo: string;
  itens: { posto: string | null; mensagem: string }[];
  variante: "erro" | "aviso";
}) {
  // AlertTriangle é apelido de TriangleAlert no lucide: usá-lo nos dois casos
  // deixaria erro e aviso com o mesmo ícone.
  const Icone = variante === "erro" ? TriangleAlert : CircleAlert;
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        variante === "erro"
          ? "border-destructive/50 bg-destructive/10"
          : "border-amber-500/50 bg-amber-500/10"
      }`}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icone className="size-4" aria-hidden />
        {titulo} ({itens.length})
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {itens.map((item, indice) => (
          <li key={`${item.mensagem}-${indice}`}>
            {item.posto ? <span className="font-mono text-xs">{item.posto}</span> : null}
            <span className={item.posto ? "ml-1.5" : ""}>{item.mensagem}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function MesInexistente({
  ano,
  mes,
  existeAlgum,
}: {
  ano: number;
  mes: number;
  existeAlgum: boolean;
}) {
  const { criarMesAction } = await import("@/app/acoes/escala");
  const { FormCriarMes } = await import("@/components/escala/form-criar-mes");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{rotuloMesCurto(ano, mes)}</h1>
      <p className="mt-2 text-muted-foreground">
        {existeAlgum
          ? "Este mês ainda não tem escala. Gere pelo rodízio a partir do mês anterior ou crie em branco para preencher na mão."
          : "Este é o primeiro mês. Crie a escala e preencha manualmente quem fica em cada vaga — os próximos meses podem ser gerados pelo rodízio."}
      </p>

      <div className="mt-6">
        <FormCriarMes ano={ano} mes={mes} usarRodizio={existeAlgum} action={criarMesAction} />
      </div>
    </div>
  );
}
