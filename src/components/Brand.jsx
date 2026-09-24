import { APP_NAME, BRAND_COLOR, brandParts } from "../config.js";

export function Brand() {
  const [a, b] = brandParts(APP_NAME);
  return <>{a}<span style={{ color: BRAND_COLOR }}>{b}</span></>;
}
