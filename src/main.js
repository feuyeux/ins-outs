// Main Application Entry Point
import "./styles/vendor/talbica-base.css";
import "./styles/app.css";

import { initSpaceTravel } from "./components/space-travel.js";
import audioEngine from "./audio/audio-engine.js";
import { Header } from "./components/header.js";
import { PeriodicTable } from "./components/periodic-table.js";
import { ElementCard } from "./components/element-card.js";
import { Glossary } from "./components/glossary.js";
import { ReactionsModal } from "./components/reactions-modal.js";
import { PrintDialog } from "./components/print-dialog.js";
import { calculateMolarMass, popularCompounds } from "./components/smart-field.js";
import { elementsData } from "./data/elements.js";
import { elementZh, uiText } from "./data/translations.js";

function initApp() {
  document.body.classList.add("visible");

  // 1. Initialize Space Travel Starfield Canvas
  initSpaceTravel("space-travel");

  // Unlock AudioContext on first user interaction
  const unlockAudio = () => {
    audioEngine.ensureContext();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  // 2. Elements & Component Initialization
  const tableContainer = document.getElementById("table");
  const cardElement = document.getElementById("card");
  const reactionsModalEl = document.getElementById("reactionsResultModal");
  const printModalEl = document.getElementById("printDialogCustom");
  const backdropEl = document.querySelector(".modal-backdrop");
  const glossaryContainer = document.querySelector(".glossary");

  const elementCard = new ElementCard(cardElement, backdropEl);
  const reactionsModal = new ReactionsModal(reactionsModalEl, backdropEl);
  const printDialog = new PrintDialog(printModalEl, backdropEl);
  const glossary = new Glossary(glossaryContainer);

  const periodicTable = new PeriodicTable(tableContainer, symbol => {
    elementCard.open(symbol);
  });

  // 3. Initialize Header
  const header = new Header({
    onLanguageChange: lang => {
      periodicTable.setLanguage(lang);
      elementCard.setLanguage(lang);
      reactionsModal.setLanguage(lang);
      printDialog.setLanguage(lang);
      glossary.setLanguage(lang);
      updateSmartFieldTexts(lang);
    },
    onModeChange: mode => {
      periodicTable.setMode(mode);
    },
    onHeatmapChange: property => {
      periodicTable.setHeatmapProperty(property);
    },
    onPrintClick: () => {
      printDialog.open();
    }
  });

  // Expose to window for testing / automation
  window.app = { periodicTable, elementCard, reactionsModal, printDialog, glossary, header };

  // 4. Smart Field Logic & Interactivity
  const smartInput = document.getElementById("smartInput");
  const molarMassTooltip = document.getElementById("molarMassTooltip");
  const btnSolve = document.getElementById("smartBtnSolve");
  const btnBalance = document.getElementById("smartBtnBalance");
  const btnInfo = document.getElementById("smartBtnInfo");

  function updateSmartFieldTexts(lang) {
    const t = uiText[lang];
    if (!t) return;
    if (smartInput) smartInput.placeholder = t.searchPlaceholder;
    if (btnSolve) btnSolve.textContent = t.solve;
    if (btnBalance) btnBalance.textContent = t.balance;
    if (btnInfo) btnInfo.textContent = t.showInfo;
  }

  // Initialize smart field localized texts
  updateSmartFieldTexts(localStorage.getItem("talbica_lang") || "zh");

  // URL parameters & Hash support (e.g. ?element=Cu&theme=light&lang=zh or #Cu)
  const urlParams = new URLSearchParams(window.location.search);
  const paramTheme = urlParams.get("theme");
  const paramLang = urlParams.get("lang");
  const paramElement = urlParams.get("element") || window.location.hash.replace("#", "");

  if (paramTheme) header.setTheme(paramTheme);
  if (paramLang) header.setLanguage(paramLang);
  if (paramElement && elementsData[paramElement]) {
    elementCard.open(paramElement);
  }

  // Handle Smart Input Typing
  smartInput?.addEventListener("input", () => {
    const query = smartInput.value.trim();

    if (!query) {
      if (molarMassTooltip) molarMassTooltip.style.display = "none";
      return;
    }

    // Auto calculate molar mass if it looks like a formula (e.g. H2O, Fe2O3, C6H12O6)
    if (/^[A-Za-z0-9()\s]+$/.test(query)) {
      const mass = calculateMolarMass(query);
      if (mass && molarMassTooltip) {
        molarMassTooltip.style.display = "block";
        molarMassTooltip.querySelector("span").textContent = `${mass}`;
      } else if (molarMassTooltip) {
        molarMassTooltip.style.display = "none";
      }
    } else if (molarMassTooltip) {
      molarMassTooltip.style.display = "none";
    }
  });

  // Enter Key Handler in Smart Input
  smartInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = smartInput.value.trim();
      if (!query) return;

      if (query.includes("=") || query.includes("->") || query.includes("→")) {
        reactionsModal.showBalanceResult(query);
      } else if (query.includes("+")) {
        reactionsModal.showSolveResult(query);
      } else {
        handleLookup(query);
      }
    }
  });

  // Solve Button Click
  btnSolve?.addEventListener("click", () => {
    const query = smartInput?.value.trim();
    if (!query) return;
    reactionsModal.showSolveResult(query);
  });

  // Balance Button Click
  btnBalance?.addEventListener("click", () => {
    const query = smartInput?.value.trim();
    if (!query) return;
    reactionsModal.showBalanceResult(query);
  });

  // Show Info Button Click
  btnInfo?.addEventListener("click", () => {
    const query = smartInput?.value.trim();
    if (!query) return;
    handleLookup(query);
  });

  // Generic Lookup for Elements or Compounds
  function handleLookup(query) {
    const qLower = query.toLowerCase();

    // 1. Check chemical symbol (e.g. "Fe", "au", "O")
    for (const [sym, data] of Object.entries(elementsData)) {
      if (sym.toLowerCase() === qLower || data.Name.toLowerCase() === qLower) {
        elementCard.open(sym);
        return;
      }
    }

    // 2. Check Chinese name (e.g. "铁", "金", "氧")
    for (const [sym, zhInfo] of Object.entries(elementZh)) {
      if (zhInfo.name === query || zhInfo.pinyin.toLowerCase() === qLower) {
        elementCard.open(sym);
        return;
      }
    }

    // 3. Check popular compound (e.g. "H2O", "Water", "水", "硫酸")
    for (const [formula, comp] of Object.entries(popularCompounds)) {
      if (
        formula.toLowerCase() === qLower ||
        comp.nameEn.toLowerCase() === qLower ||
        comp.nameZh.includes(query)
      ) {
        reactionsModal.showSolveResult(formula);
        return;
      }
    }

    // Default: try solving/balancing
    reactionsModal.showSolveResult(query);
  }

  // Keyboard navigation follows the visible table grid instead of atomic
  // numbers, since periods do not contain 18 elements in every row.
  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      if (document.activeElement === smartInput) return;

      const currentSym = elementCard.currentSymbol || "H";
      const currentCell = tableContainer?.querySelector(`[data-symbol="${currentSym}"]`);
      if (!currentCell) return;
      e.preventDefault();

      const currentRow = Number(currentCell.dataset.row);
      const currentCol = Number(currentCell.dataset.col);
      const direction = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      const rowDirection = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      let target = null;

      if (direction) {
        const row = currentCell.parentElement;
        const cells = [...row.children];
        for (let col = currentCol + direction; col >= 0 && col < cells.length; col += direction) {
          if (cells[col].dataset.symbol) {
            target = cells[col];
            break;
          }
        }
      } else {
        let targetRow = currentRow + rowDirection;
        while (!target && targetRow >= 0 && targetRow < 10) {
          const row = tableContainer.querySelector(`.row[data-row="${targetRow}"]`);
          const cells = row ? [...row.children].filter(cell => cell.dataset.symbol) : [];
          target = cells.reduce(
            (closest, cell) =>
              !closest || Math.abs(Number(cell.dataset.col) - currentCol) < Math.abs(Number(closest.dataset.col) - currentCol)
                ? cell
                : closest,
            null
          );
          targetRow += rowDirection;
        }
      }

      if (target?.dataset.symbol) elementCard.open(target.dataset.symbol);
    }
  });

  // Initial language setup
  updateSmartFieldTexts(header.currentLang);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
