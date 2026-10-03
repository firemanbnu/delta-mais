import { type NoiteDeServico } from "./dominio";

export type AnoMes = { ano: number; mes: number };

export const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function rotuloMes(ano: number, mes: number): string {
  return `${MESES_PT[mes - 1] ?? mes}/${ano}`;
}

export function rotuloMesCurto(ano: number, mes: number): string {
  return `${MESES_PT[mes - 1] ?? mes} ${ano}`;
}

/** Chave estável "AAAA-MM" usada em rotas, URLs e unicidade no banco. */
export function chaveAnoMes({ ano, mes }: AnoMes): string {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}`;
}

export function parseChaveAnoMes(chave: string): AnoMes {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) {
    throw new Error(`Ano/mês inválido: ${chave}`);
  }
  return { ano, mes };
}

/** Converte para Date no meio-dia local, evitando problemas de fuso/DST. */
export function paraData(data: Date | string): Date {
  if (typeof data === "string") {
    const [ano, mes, dia] = data.slice(0, 10).split("-").map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  }
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0, 0);
}

export function paraISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Soma dias mantendo o meio-dia local, para não escorregar por horário de verão. */
export function somarDias(data: Date | string, dias: number): Date {
  const base = paraData(data);
  const resultado = new Date(base);
  resultado.setDate(base.getDate() + dias);
  return resultado;
}

/** Data no padrão brasileiro, que é o que se mostra ao usuário. */
export function formatarDataBR(data: Date | string): string {
  const dia = paraData(data);
  const diaNum = String(dia.getDate()).padStart(2, "0");
  const mesNum = String(dia.getMonth() + 1).padStart(2, "0");
  return `${diaNum}/${mesNum}/${dia.getFullYear()}`;
}

export function diasDoMes(ano: number, mes: number): Date[] {
  const total = new Date(ano, mes, 0).getDate();
  return Array.from({ length: total }, (_, i) => new Date(ano, mes - 1, i + 1, 12));
}

/** Diferença em dias inteiros, imune a horário de verão. */
export function diffDias(a: Date | string, b: Date | string): number {
  const diaA = paraData(a);
  const diaB = paraData(b);
  const utcA = Date.UTC(diaA.getFullYear(), diaA.getMonth(), diaA.getDate());
  const utcB = Date.UTC(diaB.getFullYear(), diaB.getMonth(), diaB.getDate());
  return Math.round((utcA - utcB) / 86_400_000);
}

/**
 * Ancora efetiva do ciclo de 48h.
 *
 * O 12x36 é um ciclo de 48h: uma noite de serviço, uma de folga. A data-âncora
 * marca o primeiro serviço do ciclo, mas a equipe pode trabalhar nos dias ímpares
 * ou pares do mês. Quando a paridade pedida não bate com a da âncora, ela anda um
 * dia: o ciclo continua intacto (nunca duas noites seguidas) e as noites caem
 * exatamente nos dias pedidos.
 */
export function ancoraDoCiclo(
  ancora: Date | string,
  noiteDeServico: NoiteDeServico,
): Date {
  const base = paraData(ancora);
  const desejada = noiteDeServico === "IMPAR" ? 1 : 0;
  return base.getDate() % 2 === desejada ? base : somarDias(base, 1);
}

/**
 * Plantão 12x36: 12h de serviço (19h -> 7h) e 36h de folga, o que dá um
 * ciclo de 48h. O bombeiro trabalha uma noite, folga a outra e volta.
 *
 * Uma data é de serviço quando a distância em dias até a data-âncora é par.
 */
export function ehNoiteDeServico(
  data: Date | string,
  ancora: Date | string,
  noiteDeServico: NoiteDeServico,
): boolean {
  const diff = diffDias(data, ancoraDoCiclo(ancora, noiteDeServico));
  return (((diff % 2) + 2) % 2) === 0;
}

export function noitesDeServicoNoMes(
  ano: number,
  mes: number,
  ancora: Date | string,
  noiteDeServico: NoiteDeServico,
): Date[] {
  return diasDoMes(ano, mes).filter((d) => ehNoiteDeServico(d, ancora, noiteDeServico));
}

export function proximaNoiteDeServico(
  referencia: Date,
  ancora: Date | string,
  noiteDeServico: NoiteDeServico,
): Date {
  const base = paraData(referencia);
  for (let i = 0; i <= 7; i++) {
    const candidata = new Date(base);
    candidata.setDate(base.getDate() + i);
    if (ehNoiteDeServico(candidata, ancora, noiteDeServico)) return candidata;
  }
  return base;
}

export function anoMesAtual(): AnoMes {
  const hoje = new Date();
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
}

export function mesAnterior({ ano, mes }: AnoMes): AnoMes {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

export function mesSeguinte({ ano, mes }: AnoMes): AnoMes {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

export function somarMeses(base: AnoMes, delta: number): AnoMes {
  const total = base.ano * 12 + (base.mes - 1) + delta;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}
