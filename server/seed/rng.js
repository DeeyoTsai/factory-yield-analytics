// 可重現的偽亂數（同一顆種子每次跑出同一份資料）
function makeRng(seed = 1) {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    bool: (p = 0.5) => next() < p,
    shuffle: (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

module.exports = { makeRng };
