import { FormConfiguracoes } from "@/components/configuracoes/form-configuracoes";
import { lerConfiguracoes, listarPessoas } from "@/db/repositorio";
import {
  DIAS_SEMANA_CURTO,
  diasDoMes,
  ehNoiteDeServico,
  formatarDataBR,
  paraISO,
} from "@/lib/calendario";

export const dynamic = "force-dynamic";

export const metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const [config, pessoas] = await Promise.all([lerConfiguracoes(), listarPessoas()]);
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const ancora = String(config.dataAncora).slice(0, 10);
const hojeISO = paraISO(hoje);
  const dias = diasDoMes(ano, mes);
  const proximos = dias
    .filter((d) => paraISO(d) >= hojeISO && ehNoiteDeServico(d, ancora))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header>
        <p className="text-sm text-muted-foreground">Ajustes do plantão e da escala</p>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <FormConfiguracoes
          config={{
            turnoInicio: String(config.turnoInicio).slice(0, 5),
            turnoFim: String(config.turnoFim).slice(0, 5),
            dataAncora: ancora,
            observacoes: config.observacoes,
          }}
          ancoraISO={ancora}
        />

        <div className="space-y-4">
          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Próximas noites de serviço</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {proximos.length === 0 ? (
                <li className="text-muted-foreground">Nenhuma noite de serviço nos próximos dias.</li>
              ) : (
                proximos.map((dia) => (
<li key={paraISO(dia)} className="flex items-center justify-between">
                    <span>{formatarDataBR(dia)}</span>
                    <span className="text-muted-foreground">
                      {DIAS_SEMANA_CURTO[dia.getDay()]}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Resumo do quadro</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cadastrados</dt>
                <dd className="tabular-nums">{pessoas.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ativos</dt>
                <dd className="tabular-nums">{pessoas.filter((p) => p.ativo).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Inativos</dt>
                <dd className="tabular-nums">{pessoas.filter((p) => !p.ativo).length}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              O plantão precisa de 3 MC, 3 BA, 2 RE, 1 CE e 1 LR ativos para fechar as 10 vagas.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
