/**
 * Skor fuzzy sederhana untuk pencarian produk (tanpa dependency eksternal).
 * Skor lebih tinggi = lebih relevan.
 */
export const fuzzyScore = (query, text) => {
  const q = query.toLowerCase().trim();
  const t = (text || '').toLowerCase();
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 85;
  if (t.includes(q)) return 70;

  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) qi += 1;
  }
  if (qi === q.length) return 45;

  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 55;

  return 0;
};

export const fuzzyFilterProducts = (products, query) => {
  const q = query.trim();
  if (!q) return products;

  return products
    .map((product) => ({
      product,
      score: Math.max(
        fuzzyScore(q, product.name),
        fuzzyScore(q, product.sku_barcode)
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
};
