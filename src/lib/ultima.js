// Várias leituras do mesmo dado em paralelo (ex.: eventos realtime + a
// releitura depois de votar) podem responder fora de ordem. Isto garante que
// só a resposta da chamada mais recente é aplicada; as atrasadas são
// descartadas, em vez de sobrescrever um dado novo com um velho.
export function somenteUltima() {
  let atual = 0;
  return async function rodar(buscar, aplicar) {
    const id = ++atual;
    const resultado = await buscar();
    if (id === atual) aplicar(resultado);
  };
}
