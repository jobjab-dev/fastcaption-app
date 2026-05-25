/**
 * latex-to-unicode.ts
 * แปลง LaTeX math notation → Unicode math symbols
 * ใช้ก่อน align เพื่อให้ subtitle แสดงสัญลักษณ์คณิตศาสตร์
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unicodeit = require("unicodeit") as { replace: (s: string) => string };

/** Extract matched brace content: given pos at '{', return content + end pos */
function extractBraced(s: string, pos: number): { content: string; end: number } | null {
  if (pos >= s.length || s[pos] !== '{') return null;
  let depth = 0;
  const start = pos + 1;
  for (let i = pos; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: s.slice(start, i), end: i };
      }
    }
  }
  return null;
}

/** Convert \frac{num}{den} → num/den or (num)/(den) */
function processFrac(latex: string): string {
  let result = latex;
  let safety = 50;
  while (result.includes('\\frac') && safety-- > 0) {
    const idx = result.indexOf('\\frac');
    let pos = idx + 5;
    while (pos < result.length && result[pos] === ' ') pos++;
    const num = extractBraced(result, pos);
    if (!num) break;
    pos = num.end + 1;
    while (pos < result.length && result[pos] === ' ') pos++;
    const den = extractBraced(result, pos);
    if (!den) break;

    const numStr = num.content.trim();
    const denStr = den.content.trim();
    const needParenNum = numStr.includes(' ') || numStr.includes('+') || numStr.includes('-');
    const needParenDen = denStr.includes(' ') || denStr.includes('+') || denStr.includes('-');
    const numPart = needParenNum ? `(${numStr})` : numStr;
    const denPart = needParenDen ? `(${denStr})` : denStr;

    result = result.slice(0, idx) + `${numPart}/${denPart}` + result.slice(den.end + 1);
  }
  return result;
}

/** Convert \sqrt{content} → √(content) */
function processSqrt(latex: string): string {
  let result = latex;
  let safety = 50;
  while (result.includes('\\sqrt') && safety-- > 0) {
    const idx = result.indexOf('\\sqrt');
    let pos = idx + 5;
    while (pos < result.length && result[pos] === ' ') pos++;
    const content = extractBraced(result, pos);
    if (!content) break;
    const inner = content.content.trim();
    const needParen = inner.length > 1 && (inner.includes(' ') || inner.includes('+') || inner.includes('-'));
    const sqrtPart = needParen ? `√(${inner})` : `√${inner}`;
    result = result.slice(0, idx) + sqrtPart + result.slice(content.end + 1);
  }
  return result;
}

/** Convert common \func patterns that unicodeit misses */
function processLatexFunctions(latex: string): string {
  return latex
    .replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan')
    .replace(/\\log/g, 'log').replace(/\\ln/g, 'ln').replace(/\\lim/g, 'lim')
    .replace(/\\max/g, 'max').replace(/\\min/g, 'min')
    .replace(/\\ge(?=\s|$)/g, '≥').replace(/\\le(?=\s|$)/g, '≤')
    .replace(/\\to(?=\s|$)/g, '→');
}

/** Unicode subscript character map */
const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
};

/** Unicode superscript character map */
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
};

/** Convert remaining _X and ^X patterns that unicodeit missed */
function processSubSuperscripts(text: string): string {
  // Handle _{...} subscript groups
  let result = text.replace(/_\{([^}]+)\}/g, (_, content: string) => {
    return [...content].map(c => SUBSCRIPT_MAP[c] ?? c).join('');
  });
  // Handle ^{...} superscript groups
  result = result.replace(/\^\{([^}]+)\}/g, (_, content: string) => {
    return [...content].map(c => SUPERSCRIPT_MAP[c] ?? c).join('');
  });
  // Handle single-char _X subscripts (e.g. P_c → Pc, x_1 → x₁)
  result = result.replace(/_([a-zA-Z0-9])/g, (_, c: string) => {
    return SUBSCRIPT_MAP[c.toLowerCase()] ?? c;
  });
  // Handle single-char ^X superscripts
  result = result.replace(/\^([a-zA-Z0-9])/g, (_, c: string) => {
    return SUPERSCRIPT_MAP[c.toLowerCase()] ?? c;
  });
  return result;
}

/** Full LaTeX → Unicode pipeline for a single math expression */
function latexToUnicode(latex: string): string {
  let result = latex;
  result = processFrac(result);
  result = processSqrt(result);
  result = processLatexFunctions(result);
  result = processSubSuperscripts(result);
  result = unicodeit.replace(result);
  result = processSubSuperscripts(result); // catch any leftovers from unicodeit
  result = result.replace(/\{/g, '').replace(/\}/g, '');
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

/**
 * Convert all LaTeX math blocks in text to Unicode symbols.
 * Handles both display math ($$ ... $$) and inline math ($ ... $).
 */
export function convertMathInText(text: string): string {
  // Display math $$ ... $$
  let result = text.replace(/\$\$\s*(.*?)\s*\$\$/g, (_, latex) => {
    return latexToUnicode(latex.trim());
  });
  // Inline math $ ... $ (not $$)
  result = result.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_, latex) => {
    return latexToUnicode(latex.trim());
  });
  return result;
}
