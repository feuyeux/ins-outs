// Smart Field: Formula Search, Autocomplete, Equation Balancer & Reaction Solver
import { elementsData } from "../data/elements.js";
import { elementZh, uiText } from "../data/translations.js";
import audioEngine from "../audio/audio-engine.js";

// Popular Chemical Reactions Database
export const popularReactions = [
  { reactants: ["H2", "O2"], products: ["H2O"], equation: "2H₂ + O₂ → 2H₂O", nameEn: "Synthesis of Water", nameZh: "氢气燃烧生成水", descEn: "Exothermic synthesis reaction releasing clean energy.", descZh: "剧烈放热化合反应，生成洁净的水。" },
  { reactants: ["H2SO4", "NaOH"], products: ["Na2SO4", "H2O"], equation: "H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O", nameEn: "Neutralization", nameZh: "硫酸与氢氧化钠酸碱中和", descEn: "Acid-base neutralization forming sodium sulfate and water.", descZh: "强酸与强碱中和反应，生成硫酸钠和水。" },
  { reactants: ["HCl", "NaOH"], products: ["NaCl", "H2O"], equation: "HCl + NaOH → NaCl + H₂O", nameEn: "Neutralization", nameZh: "盐酸与氢氧化钠酸碱中和", descEn: "Forms table salt and water.", descZh: "强酸强碱中和，生成氯化钠与水。" },
  { reactants: ["Fe", "O2"], products: ["Fe2O3"], equation: "4Fe + 3O₂ → 2Fe₂O₃", nameEn: "Iron Oxidation (Rusting)", nameZh: "铁的氧化反应（铁锈生成）", descEn: "Combustion or slow rusting of iron forming ferric oxide.", descZh: "铁与氧气化合生成红棕色三氧化二铁。" },
  { reactants: ["CH4", "O2"], products: ["CO2", "H2O"], equation: "CH₄ + 2O₂ → CO₂ + 2H₂O", nameEn: "Methane Combustion", nameZh: "天然气（甲烷）充分燃烧", descEn: "Clean natural gas combustion producing carbon dioxide and water vapour.", descZh: "天然气主要成分甲烷完全燃烧，放出大量热。" },
  { reactants: ["C2H5OH", "O2"], products: ["CO2", "H2O"], equation: "C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O", nameEn: "Ethanol Combustion", nameZh: "乙醇（酒精）充分燃烧", descEn: "Alcohol combustion producing carbon dioxide and water.", descZh: "乙醇燃烧放出热量，生成二氧化碳和水。" },
  { reactants: ["Ag", "Cl2"], products: ["AgCl"], equation: "2Ag + Cl₂ → 2AgCl", nameEn: "Silver Chloride Synthesis", nameZh: "银与氯气化合生成氯化银", descEn: "Direct halogenation of silver metal.", descZh: "银与黄绿色氯气反应生成白色氯化银沉淀。" },
  { reactants: ["Na", "H2O"], products: ["NaOH", "H2"], equation: "2Na + 2H₂O → 2NaOH + H₂↑", nameEn: "Sodium with Water", nameZh: "金属钠与水剧烈反应", descEn: "Violent exothermic reaction producing hydrogen gas.", descZh: "活泼金属钠浮于水面熔化成银亮小球并游动，剧烈放热生成氢气。" },
  { reactants: ["CaCO3"], products: ["CaO", "CO2"], equation: "CaCO₃ → CaO + CO₂↑", nameEn: "Thermal Decomposition of Limestone", nameZh: "碳酸钙高温煅烧分解", descEn: "Industrial production of quicklime (calcium oxide).", descZh: "石灰石高温分解生成生石灰（氧化钙）和二氧化碳。" },
  { reactants: ["Zn", "HCl"], products: ["ZnCl2", "H2"], equation: "Zn + 2HCl → ZnCl₂ + H₂↑", nameEn: "Zinc and Hydrochloric Acid", nameZh: "锌粒与稀盐酸置换制氢", descEn: "Laboratory preparation method for hydrogen gas.", descZh: "实验室常用活泼金属与稀酸置换反应制取氢气。" },
  { reactants: ["N2", "H2"], products: ["NH3"], equation: "N₂ + 3H₂ ⇌ 2NH₃", nameEn: "Haber-Bosch Ammonia Synthesis", nameZh: "哈伯法工业合成氨", descEn: "Industrial reversible catalytic synthesis under high temp & pressure.", descZh: "现代化工基础，高温高压催化剂下可逆合成氨气。" },
  { reactants: ["AgNO3", "NaCl"], products: ["AgCl", "NaNO3"], equation: "AgNO₃ + NaCl → AgCl↓ + NaNO₃", nameEn: "Silver Chloride Precipitation", nameZh: "硝酸银与氯化钠复分解沉淀", descEn: "Standard qualitative test for chloride ions.", descZh: "氯离子特征定性检验反应，生成难溶于稀硝酸的白色絮状沉淀。" },
  { reactants: ["BaCl2", "Na2SO4"], products: ["BaSO4", "NaCl"], equation: "BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl", nameEn: "Barium Sulfate Precipitation", nameZh: "氯化钡与硫酸钠沉淀反应", descEn: "Forms white insoluble barium sulfate.", descZh: "生成极难溶于水与强酸的白色硫酸钡沉淀。" },
  { reactants: ["CuO", "H2"], products: ["Cu", "H2O"], equation: "CuO + H₂ → Cu + H₂O", nameEn: "Reduction of Copper Oxide", nameZh: "氢气还原氧化铜", descEn: "Black copper oxide reduced to red metallic copper.", descZh: "黑色氧化铜被还原为紫红色单质铜，试管内壁产生水珠。" },
  { reactants: ["Fe2O3", "CO"], products: ["Fe", "CO2"], equation: "Fe₂O₃ + 3CO → 2Fe + 3CO₂", nameEn: "Blast Furnace Iron Smelting", nameZh: "工业高炉一氧化碳炼铁", descEn: "Carbon monoxide reduces hematite to elemental iron in blast furnaces.", descZh: "工业高炉利用一氧化碳还原赤铁矿制取生铁的化学核心过程。" },
  { reactants: ["NH3", "HCl"], products: ["NH4Cl"], equation: "NH₃ + HCl → NH₄Cl", nameEn: "Ammonium Chloride Smoke", nameZh: "氨气与浓盐酸挥发反应生成白烟", descEn: "Two gases react directly to produce fine solid white smoke.", descZh: "两瓶无色挥发性气体靠近即产生浓厚白色氯化铵固体颗粒烟雾。" }
];

// Popular Compounds Knowledge
export const popularCompounds = {
  H2O: { formula: "H₂O", nameEn: "Water", nameZh: "水", mw: 18.015, descZh: "生命的源泉，极性共价无机分子。" },
  H2SO4: { formula: "H₂SO₄", nameEn: "Sulfuric Acid", nameZh: "硫酸", mw: 98.079, descZh: "强腐蚀性二元无机强酸，工业之母。" },
  HCl: { formula: "HCl", nameEn: "Hydrochloric Acid", nameZh: "盐酸 (氯化氢)", mw: 36.461, descZh: "一元强酸，无色有刺激性气味。" },
  NaOH: { formula: "NaOH", nameEn: "Sodium Hydroxide", nameZh: "氢氧化钠 (苛性钠)", mw: 39.997, descZh: "强碱性腐蚀品，易潮解。" },
  NaCl: { formula: "NaCl", nameEn: "Sodium Chloride", nameZh: "氯化钠 (食盐)", mw: 58.443, descZh: "典型离子晶体，维持生物电解质平衡。" },
  CH4: { formula: "CH₄", nameEn: "Methane", nameZh: "甲烷", mw: 16.043, descZh: "最简单的有机化合物，天然气主要成分。" },
  C2H5OH: { formula: "C₂H₅OH", nameEn: "Ethanol", nameZh: "乙醇 (酒精)", mw: 46.069, descZh: "易燃易挥发，常用有机溶剂与消毒剂。" },
  CO2: { formula: "CO₂", nameEn: "Carbon Dioxide", nameZh: "二氧化碳", mw: 44.009, descZh: "温室气体，植物光合作用原料。" },
  NH3: { formula: "NH₃", nameEn: "Ammonia", nameZh: "氨气", mw: 17.031, descZh: "刺激性碱性气体，化肥工业基础原料。" },
  C6H12O6: { formula: "C₆H₁₂O₆", nameEn: "Glucose", nameZh: "葡萄糖", mw: 180.156, descZh: "生物体内能量代谢的核心单糖。" },
  C9H8O4: { formula: "C₉H₈O₄", nameEn: "Aspirin (Acetylsalicylic Acid)", nameZh: "阿司匹林 (乙酰水杨酸)", mw: 180.157, descZh: "经典百年解热镇痛非甾体抗炎药。" },
  C13H16N2O2: { formula: "C₁₃H₁₆N₂O₂", nameEn: "Melatonin", nameZh: "褪黑素", mw: 232.278, descZh: "调节人体昼夜生物钟的脑内激素。" },
  C6H6: { formula: "C₆H₆", nameEn: "Benzene", nameZh: "苯", mw: 78.114, descZh: "芳香烃基石，具有独特大π键平面结构。" }
};

// Chemical Formula Parser. Returns null when the complete input is not a
// valid formula, so callers never accidentally calculate a partial formula.
export function parseFormula(formula) {
  if (typeof formula !== "string") return null;

  const input = formula.replace(/\s+/g, "");
  if (!input || !/^[A-Z(]/.test(input)) return null;

  let index = 0;

  const addCounts = (target, source, multiplier = 1) => {
    Object.entries(source).forEach(([element, count]) => {
      target[element] = (target[element] || 0) + count * multiplier;
    });
  };

  const readMultiplier = () => {
    const start = index;
    while (index < input.length && /\d/.test(input[index])) index += 1;
    if (start === index) return 1;

    const multiplier = Number(input.slice(start, index));
    return Number.isSafeInteger(multiplier) && multiplier > 0 ? multiplier : null;
  };

  const readGroup = stopAtClose => {
    const counts = {};
    let hasContent = false;

    while (index < input.length) {
      const char = input[index];

      if (char === ")") {
        if (!stopAtClose) return null;
        break;
      }

      if (char === "(") {
        index += 1;
        const nested = readGroup(true);
        if (!nested || input[index] !== ")") return null;
        index += 1;

        const multiplier = readMultiplier();
        if (multiplier === null) return null;
        addCounts(counts, nested, multiplier);
        hasContent = true;
        continue;
      }

      if (!/[A-Z]/.test(char)) return null;

      const symbolStart = index;
      index += 1;
      if (index < input.length && /[a-z]/.test(input[index])) index += 1;
      const symbol = input.slice(symbolStart, index);
      if (!elementsData[symbol]) return null;

      const multiplier = readMultiplier();
      if (multiplier === null) return null;
      counts[symbol] = (counts[symbol] || 0) + multiplier;
      hasContent = true;
    }

    return hasContent ? counts : null;
  };

  const counts = readGroup(false);
  return counts && index === input.length ? counts : null;
}

// Calculate molar mass from formula
export function calculateMolarMass(formula) {
  try {
    const counts = parseFormula(formula);
    if (!counts) return null;
    let totalMass = 0;
    for (const [el, count] of Object.entries(counts)) {
      if (elementsData[el] && elementsData[el]["Atomic Weight"]) {
        const weight = parseFloat(elementsData[el]["Atomic Weight"].replace(/[^0-9.]/g, ""));
        if (!isNaN(weight)) {
          totalMass += weight * count;
        }
      } else {
        return null;
      }
    }
    return totalMass > 0 ? parseFloat(totalMass.toFixed(3)) : null;
  } catch (e) {
    return null;
  }
}

class Fraction {
  constructor(numerator, denominator = 1n) {
    if (denominator === 0n) throw new Error("Cannot divide by zero");
    const sign = denominator < 0n ? -1n : 1n;
    const divisor = gcd(absBigInt(numerator), absBigInt(denominator));
    this.numerator = (numerator * sign) / divisor;
    this.denominator = (denominator * sign) / divisor;
  }

  add(other) {
    return new Fraction(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  subtract(other) {
    return this.add(other.negate());
  }

  multiply(other) {
    return new Fraction(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  divide(other) {
    return new Fraction(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  negate() {
    return new Fraction(-this.numerator, this.denominator);
  }

  isZero() {
    return this.numerator === 0n;
  }
}

const absBigInt = value => (value < 0n ? -value : value);

const gcd = (left, right) => {
  let a = left;
  let b = right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a || 1n;
};

const lcm = (left, right) => (left / gcd(left, right)) * right;

// Gaussian elimination for chemical equation balancing.
export function balanceEquation(equationStr) {
  try {
    const sides = equationStr.split(/=|->|→/);
    if (sides.length !== 2) return null;

    const leftSpecs = sides[0].split("+").map(s => s.trim()).filter(Boolean);
    const rightSpecs = sides[1].split("+").map(s => s.trim()).filter(Boolean);

    if (leftSpecs.length === 0 || rightSpecs.length === 0) return null;

    const allSpecs = [...leftSpecs, ...rightSpecs];
    const allParsed = allSpecs.map(s => parseFormula(s));
    if (allParsed.some(parsed => !parsed)) return null;

    // Collect all unique elements
    const elementsSet = new Set();
    allParsed.forEach(p => Object.keys(p).forEach(k => elementsSet.add(k)));
    const elements = Array.from(elementsSet);

    const m = elements.length;
    const n = allSpecs.length;

    // Matrix: m rows (elements), n columns (molecules)
    // Left side counts positive, right side counts negative
    const matrix = [];
    for (let i = 0; i < m; i++) {
      const row = [];
      const el = elements[i];
      for (let j = 0; j < n; j++) {
        const count = allParsed[j][el] || 0;
        row.push(new Fraction(BigInt(j < leftSpecs.length ? count : -count)));
      }
      matrix.push(row);
    }

    // Reduce the homogeneous system to RREF and use its single free
    // variable to construct the smallest positive integer solution.
    let pivotRow = 0;
    const pivotColumns = [];
    for (let column = 0; column < n && pivotRow < m; column += 1) {
      let pivot = pivotRow;
      while (pivot < m && matrix[pivot][column].isZero()) pivot += 1;
      if (pivot === m) continue;

      [matrix[pivotRow], matrix[pivot]] = [matrix[pivot], matrix[pivotRow]];
      const pivotValue = matrix[pivotRow][column];
      matrix[pivotRow] = matrix[pivotRow].map(value => value.divide(pivotValue));

      for (let row = 0; row < m; row += 1) {
        if (row === pivotRow || matrix[row][column].isZero()) continue;
        const factor = matrix[row][column];
        matrix[row] = matrix[row].map((value, col) => value.subtract(factor.multiply(matrix[pivotRow][col])));
      }

      pivotColumns.push(column);
      pivotRow += 1;
    }

    const freeColumns = Array.from({ length: n }, (_, column) => column).filter(
      column => !pivotColumns.includes(column)
    );
    if (freeColumns.length !== 1) return null;

    const freeColumn = freeColumns[0];
    const solution = new Array(n).fill(null).map(() => new Fraction(0n));
    solution[freeColumn] = new Fraction(1n);
    pivotColumns.forEach((column, row) => {
      solution[column] = matrix[row][freeColumn].negate();
    });

    if (solution.some(value => value.numerator <= 0n)) {
      if (solution.every(value => value.numerator < 0n)) {
        for (let i = 0; i < solution.length; i += 1) solution[i] = solution[i].negate();
      } else {
        return null;
      }
    }

    const commonDenominator = solution.reduce((current, value) => lcm(current, value.denominator), 1n);
    const integerCoeffs = solution.map(value => value.numerator * (commonDenominator / value.denominator));
    const commonDivisor = integerCoeffs.reduce((current, value) => gcd(current, absBigInt(value)), 0n);
    const coeffs = integerCoeffs.map(value => Number(value / commonDivisor));
    if (coeffs.some(value => !Number.isSafeInteger(value) || value <= 0)) return null;

    // Format balanced equation
    const leftTerms = leftSpecs.map((spec, i) => {
      const c = coeffs[i];
      return (c > 1 ? c : "") + spec;
    });

    const rightTerms = rightSpecs.map((spec, i) => {
      const c = coeffs[leftSpecs.length + i];
      return (c > 1 ? c : "") + spec;
    });

    return {
      balancedEquation: `${leftTerms.join(" + ")} → ${rightTerms.join(" + ")}`,
      coeffs,
      leftSpecs,
      rightSpecs
    };
  } catch (e) {
    console.error("Balancing error:", e);
    return null;
  }
}

// Find reaction from reactants
export function solveReaction(inputStr) {
  const cleaned = inputStr.replace(/→|->|=/g, "+").trim();
  const inputParts = cleaned.split("+").map(s => s.trim().toUpperCase()).filter(Boolean);

  for (const r of popularReactions) {
    const rReactants = r.reactants.map(s => s.toUpperCase());
    if (rReactants.length === inputParts.length) {
      const matchAll = rReactants.every(reactant => inputParts.includes(reactant));
      if (matchAll) return r;
    }
  }
  return null;
}
