import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { ConfigurarRodada, LinhaConvite } from "@/components/desempenho/gestao-pares";
import { lerCiclo, listarAvaliados } from "@/db/desempenho";
import { listarConvites, obterRodada, respostasColegas } from "@/db/desempenho-pares";
import { exigirGestao } from "@/lib/acesso-gestao";
import { MIN_RESPOSTAS_COLEGAS } from "@/lib/desempenho";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avaliação pelos colegas · Desempenho" };

export default async function AvaliacaoColegas({ searchParams }: PageProps<"/desempenho/colegas">) {
  const ciclo = lerCiclo((await searchParams).ciclo);
  await exigirGestao(`/desempenho/colegas?ciclo=${ciclo}`);

  const [membros, rodada, convites, respostas] = await Promise.all([
    listarAvaliados(ciclo),
    obterRodada(ciclo),
    listarConvites(ciclo),
    respostasColegas(ciclo),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "delta-mais.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;

  const pessoas = membros.map((m) => ({
    id: m.pessoa.id,
    nome: m.pessoa.nome,
    apelido: m.pessoa.nomeGuerra,
    funcao: m.pessoa.funcao,
  }));
  const padrao = membros.filter((m) => m.pessoa.funcao !== "BA-CE").map((m) => m.pessoa.id);
  const avaliadosIniciais = rodada?.avaliados ?? padrao;
  const respondentesIniciais = rodada ? convites.map((c) => c.convite.efetivoId) : padrao;
  const respondidos = convites.filter((c) => c.convite.respondidoEm).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link
        href={`/desempenho?ciclo=${ciclo}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Painel da equipe
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Avaliação pelos colegas · {ciclo}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Cada bombeiro recebe um link pessoal de uso único (só abre o formulário, sem acesso ao resto do sistema) com o
        mesmo formulário da empresa e uma nota para cada colega em cada item. As respostas são anônimas: as notas são
        gravadas separadas por avaliado, sem quem respondeu, e a média de alguém só aparece com {MIN_RESPOSTAS_COLEGAS}{" "}
        respostas ou mais.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1. Quem participa</h2>
        <div className="mt-2">
          <ConfigurarRodada
            key={`${ciclo}-${avaliadosIniciais.join(",")}-${respondentesIniciais.join(",")}`}
            ciclo={ciclo}
            pessoas={pessoas}
            avaliadosIniciais={avaliadosIniciais}
            respondentesIniciais={respondentesIniciais}
          />
        </div>
      </section>

      {convites.length > 0 ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Enviar os links</h2>
            <span className="text-sm">
              <strong>{respondidos}</strong> de {convites.length} responderam
            </span>
          </div>
          <ul className="mt-2 rounded-xl border">
            {convites.map(({ convite, pessoa }) => (
              <LinhaConvite
                key={convite.id}
                conviteId={convite.id}
                efetivoId={pessoa.id}
                nome={pessoa.nome}
                apelido={pessoa.nomeGuerra}
                telefone={pessoa.telefone}
                url={`${base}/avaliar/${convite.token}`}
                ciclo={ciclo}
                status={convite.respondidoEm ? "RESPONDIDO" : convite.abertoEm ? "ABERTO" : "PENDENTE"}
              />
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Com o WhatsApp salvo, o botão abre a conversa da pessoa com a mensagem pronta; sem número, o WhatsApp pede para
            escolher o contato. O link fica preso ao primeiro aparelho/navegador que o abrir. Se a pessoa abrir no
            aparelho errado, use &quot;Novo link&quot;.
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">3. Respostas recebidas</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {membros
            .filter((m) => avaliadosIniciais.includes(m.pessoa.id))
            .map((m) => {
              const n = respostas.get(m.pessoa.id)?.length ?? 0;
              return (
                <li key={m.pessoa.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <Link href={`/desempenho/${m.pessoa.id}?ciclo=${ciclo}&visao=comparar`} className="truncate hover:underline">
                    {m.pessoa.nomeGuerra ?? m.pessoa.nome}
                  </Link>
                  <span
                    className={`shrink-0 text-xs ${n >= MIN_RESPOSTAS_COLEGAS ? "text-emerald-600" : "text-muted-foreground"}`}
                  >
                    {n} {n === 1 ? "resposta" : "respostas"}
                  </span>
                </li>
              );
            })}
        </ul>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Para ver os resultados, use o seletor de visão no painel da equipe e no painel individual: minha avaliação,
          média dos colegas, combinada ou comparação lado a lado.
        </p>
      </section>
    </div>
  );
}
