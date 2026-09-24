/*
 * Regras de username do app.
 * - Único no sistema (constraint UNIQUE em profiles.username — ver schema.sql).
 * - Sempre salvo em minúsculas, sem espaços e sem @, pra "Marina" e "marina"
 *   serem a mesma pessoa.
 * - Formato: 3 a 20 caracteres, apenas letras, números, _ e ponto.
 */
export const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

// Normaliza para o formato canônico que vai pro banco.
export function normalizeUsername(raw = "") {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")            // remove @ inicial (busca com ou sem @)
    .replace(/[^a-z0-9_.]/g, "")   // descarta caracteres inválidos (inclui espaços)
    .slice(0, 20);
}

export function validateUsername(username) {
  return USERNAME_REGEX.test(username);
}
