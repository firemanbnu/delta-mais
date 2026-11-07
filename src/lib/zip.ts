import { deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * Leitura e escrita mínimas de ZIP (o formato do .xlsx), só com zlib do Node.
 * Entradas não alteradas são copiadas com os bytes comprimidos originais.
 */

export type EntradaZip = {
  nome: string;
  metodo: number;
  crc: number;
  tamanho: number;
  comprimido: Buffer;
  /** Hora/data no formato DOS, copiadas do original. */
  hora: number;
  dataDos: number;
};

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(dados: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function lerZip(arquivo: Buffer): EntradaZip[] {
  let fim = -1;
  for (let i = arquivo.length - 22; i >= Math.max(0, arquivo.length - 65557); i--) {
    if (arquivo.readUInt32LE(i) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new Error("Arquivo ZIP inválido.");
  const total = arquivo.readUInt16LE(fim + 10);
  let p = arquivo.readUInt32LE(fim + 16);

  const entradas: EntradaZip[] = [];
  for (let i = 0; i < total; i++) {
    if (arquivo.readUInt32LE(p) !== 0x02014b50) throw new Error("Diretório do ZIP inválido.");
    const metodo = arquivo.readUInt16LE(p + 10);
    const hora = arquivo.readUInt16LE(p + 12);
    const dataDos = arquivo.readUInt16LE(p + 14);
    const crc = arquivo.readUInt32LE(p + 16);
    const tamComp = arquivo.readUInt32LE(p + 20);
    const tamanho = arquivo.readUInt32LE(p + 24);
    const lenNome = arquivo.readUInt16LE(p + 28);
    const lenExtra = arquivo.readUInt16LE(p + 30);
    const lenComent = arquivo.readUInt16LE(p + 32);
    const local = arquivo.readUInt32LE(p + 42);
    const nome = arquivo.subarray(p + 46, p + 46 + lenNome).toString("utf8");

    const inicio = local + 30 + arquivo.readUInt16LE(local + 26) + arquivo.readUInt16LE(local + 28);
    entradas.push({
      nome,
      metodo,
      crc,
      tamanho,
      comprimido: Buffer.from(arquivo.subarray(inicio, inicio + tamComp)),
      hora,
      dataDos,
    });
    p += 46 + lenNome + lenExtra + lenComent;
  }
  return entradas;
}

export function conteudo(entrada: EntradaZip): Buffer {
  if (entrada.metodo === 0) return entrada.comprimido;
  if (entrada.metodo === 8) return inflateRawSync(entrada.comprimido);
  throw new Error(`Compressão ${entrada.metodo} não suportada.`);
}

/** Troca o conteúdo de uma entrada, recomprimindo. */
export function substituir(entrada: EntradaZip, novo: Buffer): EntradaZip {
  return {
    ...entrada,
    metodo: 8,
    crc: crc32(novo),
    tamanho: novo.length,
    comprimido: deflateRawSync(novo, { level: 9 }),
  };
}

export function escreverZip(entradas: EntradaZip[]): Buffer {
  const locais: Buffer[] = [];
  const central: Buffer[] = [];
  let deslocamento = 0;

  for (const e of entradas) {
    const nome = Buffer.from(e.nome, "utf8");
    const cab = Buffer.alloc(30);
    cab.writeUInt32LE(0x04034b50, 0);
    cab.writeUInt16LE(20, 4);
    cab.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    cab.writeUInt16LE(e.metodo, 8);
    cab.writeUInt16LE(e.hora, 10);
    cab.writeUInt16LE(e.dataDos, 12);
    cab.writeUInt32LE(e.crc, 14);
    cab.writeUInt32LE(e.comprimido.length, 18);
    cab.writeUInt32LE(e.tamanho, 22);
    cab.writeUInt16LE(nome.length, 26);
    cab.writeUInt16LE(0, 28);
    locais.push(cab, nome, e.comprimido);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(e.metodo, 10);
    dir.writeUInt16LE(e.hora, 12);
    dir.writeUInt16LE(e.dataDos, 14);
    dir.writeUInt32LE(e.crc, 16);
    dir.writeUInt32LE(e.comprimido.length, 20);
    dir.writeUInt32LE(e.tamanho, 24);
    dir.writeUInt16LE(nome.length, 28);
    dir.writeUInt32LE(deslocamento, 42);
    central.push(dir, nome);

    deslocamento += 30 + nome.length + e.comprimido.length;
  }

  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(tamCentral, 12);
  fim.writeUInt32LE(deslocamento, 16);
  return Buffer.concat([...locais, ...central, fim]);
}
