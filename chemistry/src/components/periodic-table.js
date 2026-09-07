// Periodic Table Component: Desktop & Mobile Rendering, Colors, Photos & Heatmaps
import { elementsData } from "../data/elements.js";
import { mediaData } from "../data/media.js";
import { elementZh, elementIpa, seriesNames, propertyDict } from "../data/translations.js";
import audioEngine from "../audio/audio-engine.js";
import chroma from "chroma-js";

export class PeriodicTable {
  constructor(container, onSelectElement) {
    this.container = container;
    this.onSelectElement = onSelectElement;
    this.currentMode = "colors"; // "colors" | "photos" | "heatmaps"
    this.currentHeatmap = "Melting Point";
    this.currentLang = localStorage.getItem("talbica_lang") || "zh";

    // Standard Desktop Table Matrix
    this.tableMatrix = [
      ["H", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "He"],
      ["Li", "Be", "", "", "", "", "", "", "", "", "", "", "B", "C", "N", "O", "F", "Ne"],
      ["Na", "Mg", "", "", "", "", "", "", "", "", "", "", "Al", "Si", "P", "S", "Cl", "Ar"],
      ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
      ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
      ["Cs", "Ba", "La*", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"],
      ["Fr", "Ra", "Ac*", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""], // gap row 8
      ["La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"], // row 9: Lanthanides (15 elements)
      ["Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"]  // row 10: Actinides (15 elements)
    ];

    this.heatmapScales = {
      "Melting Point": { key: "Absolute Melting Point", unit: "K", min: 14, max: 3915, log: false, colors: ["#3b82f6", "#06b6d4", "#10b981", "#eab308", "#ef4444"] },
      "Boiling Point": { key: "Absolute Boiling Point", unit: "K", min: 20, max: 5869, log: false, colors: ["#3b82f6", "#06b6d4", "#10b981", "#eab308", "#ef4444"] },
      "Density": { key: "Density", unit: "g/cm³", min: 0.00008, max: 22.59, log: true, colors: ["#0284c7", "#38bdf8", "#4ade80", "#facc15", "#f97316"] },
      "Atomic Weight": { key: "Atomic Weight", unit: "u", min: 1.008, max: 294, log: false, colors: ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"] },
      "Atomic Radius": { key: "Atomic Radius", unit: "pm", min: 30, max: 300, log: false, colors: ["#3b82f6", "#10b981", "#fbbf24", "#ef4444"] },
      "Electronegativity": { key: "Electronegativity", unit: "", min: 0.7, max: 3.98, log: false, colors: ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#dc2626"] },
      "% in Universe": { key: "% in Universe", unit: "%", min: 0.00001, max: 75, log: true, colors: ["#1e293b", "#3b82f6", "#a855f7", "#ec4899"] },
      "% in Earth's Crust": { key: "% in Earth's Crust", unit: "%", min: 0.000001, max: 46.1, log: true, colors: ["#1e293b", "#0284c7", "#10b981", "#f59e0b"] },
      "Half-Life": { key: "Half-Life Large Number", unit: "s", min: 0.001, max: 1e24, log: true, colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"] }
    };

    this.legendEl = document.getElementById("legendElement");
    this.lastHoveredSymbol = "H";
    this.render();
    this.updateLegend("H");
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.updateTexts();
  }

  setMode(mode) {
    this.currentMode = mode;
    audioEngine.playModeSwitch();
    this.updateModeStyles();
  }

  setHeatmapProperty(property) {
    this.currentHeatmap = property;
    this.currentMode = "heatmaps";
    audioEngine.playModeSwitch();
    this.updateHeatmapStyles();
  }

  render() {
    this.container.innerHTML = "";

    this.tableMatrix.forEach((row, rowIdx) => {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      rowEl.dataset.row = rowIdx;

      row.forEach((symbol, colIdx) => {
        if (!symbol) {
          const empty = document.createElement("div");
          empty.className = "element empty";
          empty.dataset.row = rowIdx;
          empty.dataset.col = colIdx;
          rowEl.appendChild(empty);
          return;
        }

        // Special place markers for Lanthanide / Actinide
        if (symbol === "La*") {
          const marker = document.createElement("div");
          marker.className = "element marker-element";
          marker.dataset.row = rowIdx;
          marker.dataset.col = colIdx;
          marker.dataset.type = "Lanthanide";
          marker.innerHTML = `
            <div class="property" data-property="Atomic Number">57-71</div>
            <div class="property" data-property="Symbol">La-Lu</div>
            <div class="property" data-property="Name">${this.currentLang === "zh" ? "镧系" : "Lanthanoids"}</div>
          `;
          rowEl.appendChild(marker);
          return;
        }

        if (symbol === "Ac*") {
          const marker = document.createElement("div");
          marker.className = "element marker-element";
          marker.dataset.row = rowIdx;
          marker.dataset.col = colIdx;
          marker.dataset.type = "Actinide";
          marker.innerHTML = `
            <div class="property" data-property="Atomic Number">89-103</div>
            <div class="property" data-property="Symbol">Ac-Lr</div>
            <div class="property" data-property="Name">${this.currentLang === "zh" ? "锕系" : "Actinoids"}</div>
          `;
          rowEl.appendChild(marker);
          return;
        }

        const data = elementsData[symbol];
        if (!data) return;

        const zh = elementZh[symbol] || { name: data.Name, pinyin: "" };
        const el = document.createElement("div");
        el.className = `element ${symbol} appeared`;
        el.dataset.symbol = symbol;
        el.dataset.number = data["Atomic Number"];
        el.dataset.row = rowIdx;
        el.dataset.col = colIdx;
        el.dataset.type = data.Series;
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");

        // Photo thumbnail URL
        const photoUrl = `https://www.talbica.com/Elements/Previews/${symbol}.jpg`;
        el.style.setProperty("--photo", `url("${photoUrl}")`);

        const isZh = this.currentLang === "zh";
        const ipa = elementIpa[symbol] || "";
        const nameContent = isZh
          ? `<ruby class="cell-ruby">${zh.name}<rt class="cell-pinyin">${zh.pinyin}</rt></ruby>`
          : data.Name;
        el.innerHTML = `
          <div class="property" data-property="Atomic Number">${data["Atomic Number"]}</div>
          <div class="property" data-property="Symbol">${symbol}</div>
          <div class="property" data-property="Name">${nameContent}</div>
          <div class="property property-inline" data-property="Atomic Weight">${parseFloat(data["Atomic Weight"]).toFixed(2)}</div>
        `;
        el.setAttribute("title", `${data["Atomic Number"]} ${symbol} · ${zh.name} (${zh.pinyin}) | ${data.Name} ${ipa}`);

        // Event Listeners
        el.addEventListener("mouseenter", () => {
          audioEngine.playHover(data["Atomic Number"]);
          this.highlightLegend(data.Series);
          this.updateLegend(symbol);
        });

        el.addEventListener("mouseleave", () => {
          this.unhighlightLegend();
        });

        el.addEventListener("click", () => {
          audioEngine.playOpen();
          if (this.onSelectElement) this.onSelectElement(symbol);
        });

        el.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          el.click();
        });

        rowEl.appendChild(el);
      });

      this.container.appendChild(rowEl);
    });

    this.updateModeStyles();
    this.updateTexts();
    this.updateLegend(this.lastHoveredSymbol);
  }

  updateTexts() {
    const isZh = this.currentLang === "zh";

    // 1. Update element cells
    const elements = this.container.querySelectorAll(".element:not(.empty):not(.marker-element)");
    elements.forEach(el => {
      const sym = el.dataset.symbol;
      const data = elementsData[sym];
      if (!data) return;
      const zh = elementZh[sym] || { name: data.Name, pinyin: "" };
      const ipa = elementIpa[sym] || "";
      const nameEl = el.querySelector('.property[data-property="Name"]');

      if (nameEl) {
        nameEl.innerHTML = isZh
          ? `<ruby class="cell-ruby">${zh.name}<rt class="cell-pinyin">${zh.pinyin}</rt></ruby>`
          : data.Name;
      }
      el.setAttribute("title", `${data["Atomic Number"]} ${sym} · ${zh.name} (${zh.pinyin}) | ${data.Name} ${ipa}`);
    });

    // 2. Update marker elements
    const laMarker = this.container.querySelector('.marker-element[data-type="Lanthanide"] .property[data-property="Name"]');
    if (laMarker) laMarker.textContent = isZh ? "镧系" : "Lanthanoids";
    const acMarker = this.container.querySelector('.marker-element[data-type="Actinide"] .property[data-property="Name"]');
    if (acMarker) acMarker.textContent = isZh ? "锕系" : "Actinoids";

    // 3. Update bottom table legend
    const legendTitle = document.querySelector(".tableLegend h1");
    if (legendTitle) legendTitle.textContent = isZh ? "元素分类" : "Element types";
    const legendTitleH3 = document.querySelector(".tableLegend h3");
    if (legendTitleH3) legendTitleH3.textContent = isZh ? "元素分类" : "Element types";

    const legendItems = document.querySelectorAll(".tableLegendItem");
    legendItems.forEach(item => {
      const cat = item.dataset.item;
      const text = isZh ? seriesNames.zh[cat] : seriesNames.en[cat];
      const link = item.querySelector("a");
      if (link && text) {
        link.innerHTML = `<span></span> ${text}`;
      }
    });

    if (this.currentMode === "heatmaps") {
      this.updateHeatmapStyles();
    }
  }

  updateModeStyles() {
    const elements = this.container.querySelectorAll(".element:not(.empty)");

    elements.forEach(el => {
      el.classList.remove("photo-mode", "heatmap-mode");
      el.style.backgroundColor = "";
      el.style.color = "";
      el.style.borderColor = "";

      const weightEl = el.querySelector('.property[data-property="Atomic Weight"]');
      if (weightEl) {
        const sym = el.dataset.symbol;
        if (elementsData[sym]) {
          weightEl.textContent = parseFloat(elementsData[sym]["Atomic Weight"]).toFixed(2);
        }
      }
    });

    const legendBar = document.getElementById("heatmapLegendBar");

    if (this.currentMode === "photos") {
      elements.forEach(el => el.classList.add("photo-mode"));
      if (legendBar) {
        legendBar.classList.remove("active");
        legendBar.style.display = "none";
      }
    } else if (this.currentMode === "heatmaps") {
      this.updateHeatmapStyles();
    } else {
      // Colors mode
      if (legendBar) {
        legendBar.classList.remove("active");
        legendBar.style.display = "none";
      }
    }
  }

  updateHeatmapStyles() {
    const config = this.heatmapScales[this.currentHeatmap] || this.heatmapScales["Melting Point"];
    const scale = chroma.scale(config.colors).domain([0, 1]);

    const elements = this.container.querySelectorAll(".element:not(.empty):not(.marker-element)");
    elements.forEach(el => {
      const sym = el.dataset.symbol;
      const data = elementsData[sym];
      if (!data) return;

      el.classList.add("heatmap-mode");

      let rawVal = data[config.key];
      let val = parseFloat(String(rawVal || "").replace(/[^0-9.-]/g, ""));

      const propEl = el.querySelector('.property[data-property="Atomic Weight"]');

      if (isNaN(val) || rawVal === "N/A" || rawVal === undefined) {
        el.style.backgroundColor = "rgba(40, 45, 55, 0.4)";
        el.style.color = "rgba(255, 255, 255, 0.3)";
        if (propEl) propEl.textContent = "—";
        return;
      }

      // Calculate normalized 0..1 ratio
      let ratio = 0;
      if (config.log) {
        const safeVal = Math.max(config.min, val);
        ratio = (Math.log10(safeVal) - Math.log10(config.min)) / (Math.log10(config.max) - Math.log10(config.min));
      } else {
        ratio = (val - config.min) / (config.max - config.min);
      }
      ratio = Math.max(0, Math.min(1, ratio));

      const color = scale(ratio).hex();
      el.style.backgroundColor = color;
      el.style.color = chroma(color).luminance() > 0.4 ? "#000" : "#fff";
      el.style.borderColor = "rgba(255,255,255,0.3)";

      if (propEl) {
        propEl.textContent = `${val.toFixed(val < 10 && val > -10 ? 2 : 0)} ${config.unit}`;
      }
    });

    // Update legend gradient bar
    this.updateLegendGradient(config);
  }

  updateLegendGradient(config) {
    const legendBar = document.getElementById("heatmapLegendBar");
    if (!legendBar) return;

    if (this.currentMode === "heatmaps" && config) {
      legendBar.classList.add("active");
      legendBar.style.display = "block";
      const gradient = legendBar.querySelector(".heatmap-gradient");
      const minLabel = legendBar.querySelector(".heatmap-min");
      const maxLabel = legendBar.querySelector(".heatmap-max");
      const titleLabel = legendBar.querySelector(".heatmap-title");

      if (gradient) {
        gradient.style.background = `linear-gradient(to right, ${config.colors.join(", ")})`;
      }
      if (minLabel) minLabel.textContent = `${config.min} ${config.unit}`;
      if (maxLabel) maxLabel.textContent = `${config.max} ${config.unit}`;
      if (titleLabel) {
        const propTitle = propertyDict[this.currentLang]?.[this.currentHeatmap] || this.currentHeatmap;
        titleLabel.textContent = propTitle;
      }
    } else {
      legendBar.classList.remove("active");
      legendBar.style.display = "none";
    }
  }

  highlightLegend(seriesType) {
    const legendItems = document.querySelectorAll(".tableLegendItem");
    legendItems.forEach(item => {
      if (item.dataset.item === seriesType) {
        item.classList.add("highlight");
      } else {
        item.classList.remove("highlight");
      }
    });
  }

  unhighlightLegend() {
    document.querySelectorAll(".tableLegendItem").forEach(i => i.classList.remove("highlight"));
  }

  updateLegend(symbol) {
    if (!this.legendEl) {
      this.legendEl = document.getElementById("legendElement");
    }
    if (!this.legendEl) return;
    this.lastHoveredSymbol = symbol || this.lastHoveredSymbol || "H";
    const data = elementsData[this.lastHoveredSymbol];
    if (!data) return;

    const isZh = this.currentLang === "zh";
    const zh = elementZh[this.lastHoveredSymbol] || { name: data.Name, pinyin: "" };
    const ipa = elementIpa[this.lastHoveredSymbol] || "";
    const seriesText = isZh ? (seriesNames.zh[data.Series] || data.Series) : (seriesNames.en[data.Series] || data.Series);

    const cardEl = this.legendEl.querySelector(".element");
    if (cardEl) {
      cardEl.setAttribute("data-type", data.Series || "");
      cardEl.setAttribute("data-symbol", this.lastHoveredSymbol);
      const numEl = cardEl.querySelector('.property[data-property="Atomic Number"]');
      if (numEl) numEl.textContent = data["Atomic Number"];
      const symEl = cardEl.querySelector('.property[data-property="Symbol"]');
      if (symEl) symEl.textContent = this.lastHoveredSymbol;
      const nameEl = cardEl.querySelector('.property[data-property="Name"]');
      if (nameEl) {
        if (isZh) {
          nameEl.innerHTML = `<ruby class="legend-ruby">${zh.name}<rt class="legend-pinyin">${zh.pinyin}</rt></ruby>`;
        } else {
          nameEl.textContent = data.Name;
        }
      }
      const weightEl = cardEl.querySelector('.property[data-property="Atomic Weight"]');
      if (weightEl) weightEl.textContent = parseFloat(data["Atomic Weight"]).toFixed(3);
    }

    const infoEl = this.legendEl.querySelector(".elementInfo");
    if (infoEl) {
      infoEl.setAttribute("data-type", data.Series || "");
      const seriesProp = infoEl.querySelector('.property[data-property="Series"]');
      if (seriesProp) {
        if (isZh) {
          seriesProp.innerHTML = `<span class="legend-series-text">${seriesText}</span> <span class="legend-ipa-tag">${data.Name} ${ipa}</span>`;
        } else {
          seriesProp.innerHTML = `<span class="legend-series-text">${seriesText}</span> <span class="legend-ipa-tag">${ipa} · <ruby class="legend-ruby-sub">${zh.name}<rt>${zh.pinyin}</rt></ruby></span>`;
        }
      }

      const setProp = (propName, label, valStr) => {
        const propEl = infoEl.querySelector(`.property[data-property="${propName}"]`);
        if (propEl) {
          const nameEl = propEl.querySelector(".propertyName");
          const valEl = propEl.querySelector(".propertyValue");
          if (nameEl) nameEl.textContent = label;
          if (valEl) valEl.innerHTML = valStr || "—";
        }
      };

      setProp("Atomic Weight", isZh ? "原子量" : "Atomic weight", `${data["Atomic Weight"]}`);
      
      let meltStr = data["Melting Point"] ? data["Melting Point"].replace(/&deg;C/g, "°C") : "—";
      let boilStr = data["Boiling Point"] ? data["Boiling Point"].replace(/&deg;C/g, "°C") : "—";
      setProp("Melting Point", isZh ? "熔点" : "Melting point", meltStr);
      setProp("Boiling Point", isZh ? "沸点" : "Boiling point", boilStr);
      
      let densStr = data.Density ? data.Density.replace(/<sup>3<\/sup>/g, "³") : "—";
      setProp("Density", isZh ? "密度" : "Density", densStr);
    }
  }
}
