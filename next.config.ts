import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O repositório fica dentro de C:\Users\micha, que tem um package-lock.json
  // acima da pasta do projeto; sem isso o Turbopack usa a raiz errada.
  turbopack: {
    root: process.cwd(),
  },
  // PGlite carrega WASM e usa node:fs/URL; se for empacotado pelo Turbopack os
  // assets viram URL e a leitura falha com ERR_INVALID_ARG_TYPE.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
