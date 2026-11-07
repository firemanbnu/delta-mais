"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, MessageCircle, RefreshCw, Save } from "lucide-react";

import { novoLinkAction, salvarRodadaAction, salvarTelefoneAction } from "@/app/acoes/desempenho-pares";
import { Button } from "@/components/ui/button";

type Pessoa = { id: number; nome: string; apelido: string | null; funcao: string | null };

export function ConfigurarRodada({
  ciclo,
  pessoas,
  avaliadosIniciais,
  respondentesIniciais,
}: {
  ciclo: number;
  pessoas: Pessoa[];
  avaliadosIniciais: number[];
  respondentesIniciais: number[];
}) {
  const router = useRouter();
  const [avaliados, setAvaliados] = useState(new Set(avaliadosIniciais));
  const [respondentes, setRespondentes] = useState(new Set(respondentesIniciais));
  const [pendente, iniciar] = useTransition();

  function alternar(conjunto: Set<number>, definir: (s: Set<number>) => void, id: number) {
    const novo = new Set(conjunto);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    definir(novo);
  }

  return (
    <div className="rounded-xl border">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
        <span>Pessoa</span>
        <span className="w-24 text-center">É avaliado</span>
        <span className="w-24 text-center">Recebe link</span>
      </div>
      <ul>
        {pessoas.map((p) => (
          <li key={p.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b px-4 py-2 text-sm last:border-b-0">
            <span className="min-w-0">
              <span className="block truncate font-medium">{p.nome}</span>
              <span className="text-xs text-muted-foreground">{[p.apelido, p.funcao].filter(Boolean).join(" · ")}</span>
            </span>
            <label className="flex w-24 justify-center">
              <input
                type="checkbox"
                className="size-4 accent-sky-600"
                checked={avaliados.has(p.id)}
                onChange={() => alternar(avaliados, setAvaliados, p.id)}
                aria-label={`${p.nome} é avaliado`}
              />
            </label>
            <label className="flex w-24 justify-center">
              <input
                type="checkbox"
                className="size-4 accent-sky-600"
                checked={respondentes.has(p.id)}
                onChange={() => alternar(respondentes, setRespondentes, p.id)}
                aria-label={`${p.nome} recebe link`}
              />
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <span>
          {avaliados.size} avaliados · {respondentes.size} links. Ninguém avalia a si mesmo.
        </span>
        <Button
          size="sm"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarRodadaAction({ ciclo, avaliados: [...avaliados], respondentes: [...respondentes] });
              if (r.ok) {
                toast.success(r.mensagem);
                router.refresh();
              } else toast.error(r.erro);
            })
          }
        >
          <Save data-icon="inline-start" />
          {pendente ? "Salvando…" : "Salvar e gerar links"}
        </Button>
      </div>
    </div>
  );
}

function linkWhatsApp(telefone: string | null, texto: string): string {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  const numero = digitos ? (digitos.length <= 11 ? `55${digitos}` : digitos) : "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function LinhaConvite({
  conviteId,
  efetivoId,
  nome,
  apelido,
  telefone,
  url,
  ciclo,
  status,
}: {
  conviteId: number;
  efetivoId: number;
  nome: string;
  apelido: string | null;
  telefone: string | null;
  url: string;
  ciclo: number;
  status: "PENDENTE" | "ABERTO" | "RESPONDIDO";
}) {
  const router = useRouter();
  const [fone, setFone] = useState(telefone ?? "");
  const [pendente, iniciar] = useTransition();
  const mensagem =
    `Olá, ${apelido ?? nome.split(" ")[0]}! Avaliação de desempenho ${ciclo} – Equipe Delta.\n\n` +
    `Avalie seus colegas pelo link abaixo. As respostas são anônimas.\n` +
    `O link é pessoal e de uso único: abra no aparelho em que vai responder.\n\n${url}`;

  const cor =
    status === "RESPONDIDO"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "ABERTO"
        ? "bg-amber-400/20 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  const rotulo = status === "RESPONDIDO" ? "Respondido" : status === "ABERTO" ? "Aberto, sem envio" : "Não aberto";

  return (
    <li className="flex flex-wrap items-center gap-2 border-b px-4 py-3 text-sm last:border-b-0">
      <div className="min-w-40 flex-1">
        <p className="font-medium">{nome}</p>
        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs ${cor}`}>{rotulo}</span>
      </div>
      {status === "RESPONDIDO" ? null : (
        <>
          <input
            type="tel"
            inputMode="tel"
            placeholder="WhatsApp (DDD)"
            value={fone}
            onChange={(e) => setFone(e.target.value)}
            onBlur={() => {
              if (fone.replace(/\D/g, "") === (telefone ?? "")) return;
              iniciar(async () => {
                const r = await salvarTelefoneAction(efetivoId, fone);
                if (r.ok) router.refresh();
                else toast.error(r.erro);
              });
            }}
            className="h-8 w-40 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
          />
          <Button
            size="sm"
            render={<a href={linkWhatsApp(fone, mensagem)} target="_blank" rel="noopener noreferrer" />}
          >
            <MessageCircle data-icon="inline-start" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(mensagem);
                toast.success("Mensagem com o link copiada.");
              } catch {
                toast.error("Não foi possível copiar.");
              }
            }}
          >
            <Copy data-icon="inline-start" />
            Copiar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pendente}
            title="Cancela este link e gera outro (ex.: abriu no aparelho errado)"
            onClick={() => {
              if (!window.confirm(`Gerar um novo link para ${nome}? O atual deixa de funcionar.`)) return;
              iniciar(async () => {
                const r = await novoLinkAction(conviteId);
                if (r.ok) {
                  toast.success(r.mensagem);
                  router.refresh();
                } else toast.error(r.erro);
              });
            }}
          >
            <RefreshCw data-icon="inline-start" />
            Novo link
          </Button>
        </>
      )}
    </li>
  );
}
