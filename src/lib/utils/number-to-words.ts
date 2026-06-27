const ONES_MASC = [
  "",
  "один",
  "два",
  "три",
  "четыре",
  "пять",
  "шесть",
  "семь",
  "восемь",
  "девять",
];

const ONES_FEM = [
  "",
  "одна",
  "две",
  "три",
  "четыре",
  "пять",
  "шесть",
  "семь",
  "восемь",
  "девять",
];

const TEENS = [
  "десять",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
];

const TENS = [
  "",
  "",
  "двадцать",
  "тридцать",
  "сорок",
  "пятьдесят",
  "шестьдесят",
  "семьдесят",
  "восемьдесят",
  "девяносто",
];

const HUNDREDS = [
  "",
  "сто",
  "двести",
  "триста",
  "четыреста",
  "пятьсот",
  "шестьсот",
  "семьсот",
  "восемьсот",
  "девятьсот",
];

function tripletToWords(n: number, feminine: boolean): string {
  if (n === 0) {
    return "";
  }

  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;

  if (h > 0) {
    parts.push(HUNDREDS[h]!);
  }

  if (t === 1) {
    parts.push(TEENS[o]!);
    return parts.join(" ");
  }

  if (t > 1) {
    parts.push(TENS[t]!);
  }

  if (o > 0) {
    parts.push((feminine ? ONES_FEM : ONES_MASC)[o]!);
  }

  return parts.join(" ");
}

function scaleLabel(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod100 = n % 100;
  const mod10 = n % 10;

  if (mod100 >= 11 && mod100 <= 14) {
    return many;
  }
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
}

/** Converts an integer (0–999 999 999) to Russian words (lowercase). */
export function numberToWordsRu(value: number): string {
  const n = Math.floor(Math.abs(value));

  if (n === 0) {
    return "ноль";
  }

  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;

  if (millions > 0) {
    parts.push(
      `${tripletToWords(millions, false)} ${scaleLabel(millions, "миллион", "миллиона", "миллионов")}`,
    );
  }

  if (thousands > 0) {
    parts.push(
      `${tripletToWords(thousands, true)} ${scaleLabel(thousands, "тысяча", "тысячи", "тысяч")}`,
    );
  }

  if (remainder > 0 || parts.length === 0) {
    parts.push(tripletToWords(remainder, false));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Formats invoice sum: "350.00 р. (триста пятьдесят белорусских рублей 00 копеек)". */
export function formatInvoiceSum(amountRubles: number): string {
  const rubles = Math.floor(amountRubles);
  const kopecks = Math.round((amountRubles - rubles) * 100);
  const rublesWords = numberToWordsRu(rubles);
  const kopStr = String(kopecks).padStart(2, "0");

  return `${amountRubles.toFixed(2)} р. (${rublesWords} белорусских рублей ${kopStr} копеек)`;
}

/** BYN amount from kopecks stored in DB. */
export function kopecksToAmountRubles(kopecks: number): number {
  return kopecks / 100;
}
