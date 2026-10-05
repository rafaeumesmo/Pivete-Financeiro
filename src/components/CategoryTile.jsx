import { categoriaIcon, ICON_STROKE } from "../lib/icons.js";

// Tile quadrado com o ícone da categoria. `onBrand` é a variante usada dentro
// do card de swipe (fundo de marca).
// on-color: parent bg-brand — a variante onBrand só existe dentro do card de swipe.
export function CategoryTile({ categoria, size = 40, onBrand = false, className = "" }) {
  const Icon = categoriaIcon(categoria);
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-md ${onBrand ? "bg-on-brand/15 text-on-brand" : "bg-tile text-fg"} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={ICON_STROKE} />
    </span>
  );
}
