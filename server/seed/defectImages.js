/**
 * Demo 用的合成瑕疵影像產生器（SVG，零外部依賴）
 * ================================================
 *
 * 開源版不附任何真實產品影像。`npm run seed` 時就地畫出「看起來像檢測影像」的 SVG：
 *   - 原圖  `<gid>_<n>_ori.svg`   深色玻璃基板 + 該類缺陷的特徵畫法
 *   - 預測圖 `<gid>_<n>_pred.svg`  同一張 + YOLO bbox 標框與 class/confidence 標籤
 *
 * bbox 座標與寫進 `imagetb.pred_result` 的 detections **完全一致**，
 * 所以畫面上框到的位置就是 JSON 裡的位置 —— 這是要展示的重點。
 *
 * 產出位置 `client/media/demo-defects/`（`.gitignore` 已排除，不進版控），
 * 由 server 的 `express.static(client/media)` 直接以 `/demo-defects/xxx.svg` 提供。
 *
 * 要換成自己的真實影像：讓 ingestion adapter 把 `ori_img_path` / `pred_img_path`
 * 指向你自己的影像來源即可，本檔可整支刪掉。
 */
const fs = require("fs");
const path = require("path");

const W = 320;
const H = 240;
const OUT_DIR = path.join(__dirname, "..", "..", "client", "media", "demo-defects");

/** 玻璃基板底色 + 掃描線紋理，讓它看起來像檢測機台的取像 */
function background(rng) {
  const lines = [];
  for (let y = 6; y < H; y += 6) {
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#ffffff" stroke-opacity="0.02"/>`);
  }
  const tint = rng.int(0, 2);
  const base = ["#141c26", "#16202a", "#121a22"][tint];
  return `
  <rect width="${W}" height="${H}" fill="${base}"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  ${lines.join("")}`;
}

/**
 * 每一類缺陷的畫法。回傳 { marks, bbox }；bbox = [x, y, w, h]。
 * 座標刻意落在畫面中段，避免貼邊看不出來。
 */
function drawDefect(yoloClass, rng) {
  const cx = rng.int(70, 230);
  const cy = rng.int(60, 175);
  const g = (s) => `<g>${s}</g>`;

  switch (yoloClass) {
    case "scratch": {
      const len = rng.int(45, 95);
      const ang = rng.int(-40, 40);
      return {
        marks: g(`<g transform="rotate(${ang} ${cx} ${cy})">
          <rect x="${cx - len / 2}" y="${cy - 1}" width="${len}" height="2.2" fill="#eaf4ff" opacity="0.9"/>
          <rect x="${cx - len / 2}" y="${cy - 2.5}" width="${len}" height="5" fill="#9fd0ff" opacity="0.25"/>
        </g>`),
        bbox: [cx - len / 2 - 5, cy - 8, len + 10, 16],
      };
    }
    case "particle": {
      const r = rng.int(5, 11);
      return {
        marks: g(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f3f7ff" opacity="0.92"/>
          <circle cx="${cx + r * 0.5}" cy="${cy - r * 0.4}" r="${r * 0.45}" fill="#ffffff" opacity="0.8"/>
          <circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="#cfe4ff" opacity="0.15"/>`),
        bbox: [cx - r - 6, cy - r - 6, r * 2 + 12, r * 2 + 12],
      };
    }
    case "stain": {
      const rx = rng.int(16, 30);
      const ry = rng.int(11, 22);
      return {
        marks: g(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#8fa6b8" opacity="0.30"/>
          <ellipse cx="${cx - 4}" cy="${cy + 3}" rx="${rx * 0.6}" ry="${ry * 0.6}" fill="#b9c8d6" opacity="0.22"/>`),
        bbox: [cx - rx - 4, cy - ry - 4, rx * 2 + 8, ry * 2 + 8],
      };
    }
    case "broken": {
      const s = rng.int(22, 38);
      return {
        marks: g(`<polygon points="${cx - s},${cy} ${cx - s * 0.3},${cy - s * 0.7} ${cx + s * 0.4},${cy - s * 0.2} ${cx + s},${cy + s * 0.5} ${cx},${cy + s * 0.8}"
            fill="#0b0f14" stroke="#dfe9f5" stroke-width="1.6" stroke-opacity="0.85"/>
          <line x1="${cx - s}" y1="${cy}" x2="${cx + s * 0.4}" y2="${cy - s * 0.2}" stroke="#ffffff" stroke-width="1" stroke-opacity="0.6"/>`),
        bbox: [cx - s - 5, cy - s * 0.7 - 5, s * 2 + 10, s * 1.5 + 10],
      };
    }
    case "bubble": {
      const r = rng.int(9, 17);
      return {
        marks: g(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#dceaff" stroke-width="2" stroke-opacity="0.85"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="#9ec7f0" opacity="0.12"/>
          <circle cx="${cx - r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.25}" fill="#ffffff" opacity="0.75"/>`),
        bbox: [cx - r - 6, cy - r - 6, r * 2 + 12, r * 2 + 12],
      };
    }
    case "residue": {
      const w = rng.int(26, 46);
      const h = rng.int(14, 26);
      return {
        marks: g(`<path d="M ${cx - w / 2} ${cy} q ${w * 0.22} ${-h} ${w * 0.5} ${-h * 0.3}
            q ${w * 0.3} ${h * 0.4} ${w * 0.5} ${h * 0.2} q ${-w * 0.2} ${h} ${-w * 0.6} ${h * 0.8}
            q ${-w * 0.35} ${-h * 0.2} ${-w * 0.4} ${-h * 0.7} z"
            fill="#c8b98a" opacity="0.38" stroke="#e2d5a8" stroke-opacity="0.5"/>`),
        bbox: [cx - w / 2 - 5, cy - h - 5, w + 12, h * 2 + 8],
      };
    }
    case "film_thickness": {
      const w = rng.int(60, 105);
      return {
        marks: g(`<rect x="${cx - w / 2}" y="${cy - 34}" width="${w}" height="68" fill="url(#ftGrad)" opacity="0.55"/>`),
        bbox: [cx - w / 2 - 4, cy - 38, w + 8, 76],
      };
    }
    case "develop_fail": {
      const w = rng.int(34, 56);
      const dots = [];
      for (let i = 0; i < 16; i += 1) {
        dots.push(
          `<circle cx="${cx - w / 2 + rng.int(0, w)}" cy="${cy - w / 3 + rng.int(0, Math.floor(w * 0.66))}" r="${rng.int(1, 4)}" fill="#7d8fa3" opacity="${0.25 + rng.int(0, 40) / 100}"/>`
        );
      }
      return {
        marks: g(`<rect x="${cx - w / 2}" y="${cy - w / 3}" width="${w}" height="${w * 0.66}" fill="#5f7080" opacity="0.18"/>${dots.join("")}`),
        bbox: [cx - w / 2 - 5, cy - w / 3 - 5, w + 10, w * 0.66 + 10],
      };
    }
    case "chip": {
      const s = rng.int(16, 28);
      const edgeY = rng.bool(0.5) ? 0 : H;
      const dir = edgeY === 0 ? 1 : -1;
      return {
        marks: g(`<polygon points="${cx - s},${edgeY} ${cx + s},${edgeY} ${cx},${edgeY + dir * s * 1.3}"
            fill="#0a0e13" stroke="#e6eef8" stroke-width="1.6" stroke-opacity="0.8"/>`),
        bbox: [cx - s - 5, edgeY === 0 ? 0 : H - s * 1.3 - 5, s * 2 + 10, s * 1.3 + 10],
      };
    }
    case "bright_spot": {
      const r = rng.int(3, 6);
      return {
        marks: g(`<circle cx="${cx}" cy="${cy}" r="${r * 3.5}" fill="#fff6c8" opacity="0.18"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>`),
        bbox: [cx - r * 3 - 3, cy - r * 3 - 3, r * 6 + 6, r * 6 + 6],
      };
    }
    case "dark_spot": {
      const r = rng.int(4, 8);
      return {
        marks: g(`<circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="#000000" opacity="0.35"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="#04070a"/>`),
        bbox: [cx - r * 2.4 - 3, cy - r * 2.4 - 3, r * 4.8 + 6, r * 4.8 + 6],
      };
    }
    case "color_uneven":
    default: {
      const w = rng.int(70, 120);
      const h = rng.int(45, 80);
      return {
        marks: g(`<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="url(#cuGrad)" opacity="0.5"/>`),
        bbox: [cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8],
      };
    }
  }
}

const DEFS = `
  <defs>
    <radialGradient id="vig" cx="50%" cy="45%" r="72%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
    <linearGradient id="ftGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3d5f8a" stop-opacity="0"/>
      <stop offset="50%" stop-color="#6f9ad1" stop-opacity="1"/>
      <stop offset="100%" stop-color="#3d5f8a" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="cuGrad" cx="45%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#b56b8f" stop-opacity="0.75"/>
      <stop offset="60%" stop-color="#6b7fb5" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#6b7fb5" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (n) => Math.round(n * 10) / 10;

function wrap(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}${inner}</svg>\n`;
}

/** 右下角的取像資訊，讓它更像機台輸出 */
function stamp(gid, idx) {
  return `<text x="${W - 6}" y="${H - 7}" text-anchor="end" font-family="monospace" font-size="9"
    fill="#8fa4b8" opacity="0.75">${esc(gid)}#${idx}</text>`;
}

/**
 * 產生一組（原圖 + 預測圖），回傳可直接寫進 imagetb 的欄位。
 *
 * @param {string} gid
 * @param {number} idx            同一片 glass 的第幾張
 * @param {object} rng            seed/rng.js 的 rng
 * @param {object[]} defectTypes  這張圖上有哪些缺陷（1~2 個，展示單張多 detection）
 * @returns {{ ori: string, pred: string, detections: {class:string,confidence:number,bbox:number[]}[] }}
 *          ori/pred 為可直接放進 <img src> 的路徑
 */
function renderPair(gid, idx, rng, defectTypes) {
  const list = Array.isArray(defectTypes) ? defectTypes : [defectTypes];
  const bg = background(rng);

  // bbox 夾在畫布內，避免貼邊的缺陷（例如崩缺）框線與標籤被裁掉
  const clamp = ([x, y, w, h]) => {
    const nx = Math.max(1, Math.min(x, W - 6));
    const ny = Math.max(1, Math.min(y, H - 6));
    return [nx, ny, Math.min(w, W - 1 - nx), Math.min(h, H - 1 - ny)].map(r1);
  };

  const drawn = list.map((dt) => {
    const { marks, bbox } = drawDefect(dt.yolo, rng);
    return {
      marks,
      box: clamp(bbox),
      yolo: dt.yolo,
      confidence: Math.round(rng.float(0.55, 0.98) * 100) / 100,
    };
  });

  const allMarks = drawn.map((d) => d.marks).join("");
  const oriSvg = wrap(`${bg}${allMarks}${stamp(gid, idx)}`);

  const overlays = drawn
    .map((d) => {
      const [bx, by, bw, bh] = d.box;
      const labelW = d.yolo.length * 6.2 + 34;
      const labelY = by > 14 ? by - 13 : by + bh + 1;
      return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#22d36b" stroke-width="2"/>
    <rect x="${bx}" y="${labelY}" width="${labelW}" height="13" fill="#22d36b"/>
    <text x="${bx + 3}" y="${labelY + 10}" font-family="monospace" font-size="9.5" fill="#06240f">${esc(
        d.yolo
      )} ${d.confidence.toFixed(2)}</text>`;
    })
    .join("");
  const predSvg = wrap(`${bg}${allMarks}${overlays}${stamp(gid, idx)}`);

  const base = `${gid}_${idx}`;
  fs.writeFileSync(path.join(OUT_DIR, `${base}_ori.svg`), oriSvg);
  fs.writeFileSync(path.join(OUT_DIR, `${base}_pred.svg`), predSvg);

  return {
    ori: `/demo-defects/${base}_ori.svg`,
    pred: `/demo-defects/${base}_pred.svg`,
    detections: drawn.map((d) => ({ class: d.yolo, confidence: d.confidence, bbox: d.box })),
  };
}

/** 每次 seed 先清空，避免累積上一輪的檔案 */
function resetOutDir() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

module.exports = { renderPair, resetOutDir, OUT_DIR };
