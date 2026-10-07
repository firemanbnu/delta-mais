import { baterAgente, reportarComando, retirarComando } from "./api";
import { executarComando } from "./executor";
import { navegadorAberto, paginaAtiva } from "./navegador";

const INTERVALO_POLL_MS = Number(process.env.INTERVALO_POLL_MS ?? "1500");
const INTERVALO_HEARTBEAT_MS = Number(process.env.INTERVALO_HEARTBEAT_MS ?? "5000");

let executando = false;
let falhasEmSequencia = 0;

async function poll(): Promise<void> {
  if (executando) return;
  executando = true;
  try {
    const comando = await retirarComando();
    if (!comando) return;

    const resultado = await executarComando(comando.tipo, comando.payload);
    if (resultado.ok && resultado.resultado !== null) {
      await reportarComando(comando.id, {
        status: "CONCLUIDO",
        resultado: resultado.resultado,
      });
    } else if (resultado.ok) {
      await reportarComando(comando.id, { status: "CONCLUIDO" });
    } else {
      await reportarComando(comando.id, { status: "FALHOU", erro: resultado.erro });
    }
    console.log(`Comando #${comando.id} (${comando.tipo}): ${resultado.ok ? "concluído" : "falhou"}`);
  } catch (erro) {
    if (!(erro instanceof TypeError)) {
      console.error("Erro ao processar comando:", erro);
    }
    falhasEmSequencia++;
  } finally {
    executando = false;
  }
}

async function heartbeat(): Promise<void> {
  const pagina = await paginaAtiva().catch(() => null);
  const urlAtual = pagina?.url() ?? null;
  await baterAgente(urlAtual, navegadorAberto());
}

/**
 * Loop único: em falha de conexão com a aplicação, cresce o intervalo até 30s
 * para não martelar o servidor; qualquer sucesso reseta o backoff.
 */
async function loop(): Promise<void> {
  let intervalo = INTERVALO_POLL_MS;
  // Dispara heartbeat em paralelo; erro é silenciado dentro de baterAgente.
  void setInterval(heartbeat, INTERVALO_HEARTBEAT_MS);

  for (;;) {
    const falhasAntes = falhasEmSequencia;
    await poll();
    if (falhasEmSequencia <= falhasAntes) intervalo = INTERVALO_POLL_MS;
    else intervalo = Math.min(30000, INTERVALO_POLL_MS * 2 ** falhasEmSequencia);
    await new Promise((resolver) => setTimeout(resolver, intervalo));
  }
}

console.log("Agente da automação iniciado. Ctrl+C para sair.");
console.log(`Aplicação-base: ${process.env.DELTA_URL ?? "http://localhost:3000"}`);
loop().catch((erro) => {
  console.error(erro);
  process.exit(1);
});