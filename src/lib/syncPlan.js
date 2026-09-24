// Decide o que fazer no login. Pura, pra poder testar.
// - Navegador com dados de OUTRA conta: descarta o local e usa só o servidor
//   (não mistura os dados de duas pessoas).
// - Senão: o servidor vence nas chaves que ele tem, exceto as sujas; chaves que
//   só existem aqui (ex.: uso antes do primeiro login) sobem pra conta.
export function planSync({ uid, owner, localKeys, remoteKeys, dirtyKeys }) {
  if (owner && owner !== uid) {
    return { wipeLocal: true, apply: remoteKeys, push: [] };
  }
  const remote = new Set(remoteKeys);
  const dirty = new Set(dirtyKeys);
  return {
    wipeLocal: false,
    apply: remoteKeys.filter((k) => !dirty.has(k)),
    push: [...new Set([...dirtyKeys, ...localKeys.filter((k) => !remote.has(k))])],
  };
}
