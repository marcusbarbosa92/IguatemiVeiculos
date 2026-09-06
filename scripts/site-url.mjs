/** Normaliza a URL pública do site (usada por gerar-paginas.mjs e build-vercel.mjs):
 *  só http(s), sem query/hash, barras repetidas colapsadas, sempre com barra final. Lança erro se inválida. */
export function normalizarSiteUrl(raw) {
  const erro = () => new Error(`URL do site inválida: ${raw} (use https://dominio/ ou https://dominio/subpasta/)`);
  let u;
  try { u = new URL(String(raw)); } catch { throw erro(); }
  if (!/^https?:$/.test(u.protocol) || !u.hostname) throw erro();
  if (/[&<>"']/.test(String(raw))) throw new Error(`URL do site com caractere inválido para HTML: ${raw}`);
  u.pathname = u.pathname.replace(/\/{2,}/g, '/').replace(/\/?$/, '/');
  u.search = ''; u.hash = '';
  return u.href;
}
