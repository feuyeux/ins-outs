// Element Detail Card Component (Info, Photo, 3D Tabs, Bohr Model, Spectres, Candle Thermometer)
import { elementsData } from "../data/elements.js";
import { mediaData } from "../data/media.js";
import { elementZh, elementIpa, seriesNames, propertyDict, uiText, groupTitles, translateValue, getElementDescription, translateDiscovery, formatPropertyValue } from "../data/translations.js";
import { BohrModel2D } from "./bohr-model.js";
import { ElementThreeView } from "./three-model.js";
import audioEngine from "../audio/audio-engine.js";

export class ElementCard {
  constructor(cardElement, backdropEl) {
    this.card = cardElement;
    this.backdrop = backdropEl;
    this.currentSymbol = null;
    this.currentView = "info"; // "info" | "photo" | "3d"
    this.currentLang = localStorage.getItem("talbica_lang") || "zh";
    this.tempUnit = "C"; // "C" | "K" | "F"

    this.bohrModel = null;
    this.threeView = null;

    this.init();
  }

  init() {
    // Backdrop click
    if (this.backdrop) {
      this.backdrop.addEventListener("click", () => {
        if (!this.card.classList.contains("collapsed")) {
          this.close();
        }
      });
    }

    // Tab switchers
    const tabs = this.card.querySelectorAll(".cardViewSwitch");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const view = tab.dataset.item;
        this.switchView(view);
      });
    });

    // Close button
    const closeBtn = this.card.querySelector('.tool[data-tool="close"]');
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    // Esc key listener
    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && !this.card.classList.contains("collapsed")) {
        this.close();
      }
    });

    // Drag support
    this.setupDraggable();
  }

  setupDraggable() {
    const dragHandle = this.card.querySelector(".dragArea") || this.card.querySelector(".group[data-group='main']");
    if (!dragHandle) return;

    let isDragging = false;
    let startX, startY, initX = 0, initY = 0;

    dragHandle.addEventListener("mousedown", e => {
      isDragging = true;
      startX = e.clientX - initX;
      startY = e.clientY - initY;
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", e => {
      if (!isDragging) return;
      initX = e.clientX - startX;
      initY = e.clientY - startY;
      this.card.style.transform = `translate(${initX}px, ${initY}px)`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
    });
  }

  setLanguage(lang) {
    this.currentLang = lang;

    // Update Tab switch button texts
    const tabInfo = this.card.querySelector('.cardViewSwitch[data-item="info"]');
    if (tabInfo) tabInfo.textContent = uiText[lang]?.infoTab || (lang === "zh" ? "详情参数" : "Info");

    const tabPhoto = this.card.querySelector('.cardViewSwitch[data-item="photo"]');
    if (tabPhoto) tabPhoto.textContent = uiText[lang]?.photoTab || (lang === "zh" ? "实物标本" : "Photo");

    const tab3D = this.card.querySelector('.cardViewSwitch[data-item="3d"]');
    if (tab3D) tab3D.textContent = uiText[lang]?.threeDTab || "3D";

    // Update Group Titles
    const groups = this.card.querySelectorAll(".group");
    groups.forEach(g => {
      const titleEl = g.querySelector(".title");
      if (titleEl) {
        const rawKey = titleEl.dataset.i18n || titleEl.textContent.trim();
        if (groupTitles[lang] && groupTitles[lang][rawKey]) {
          titleEl.textContent = groupTitles[lang][rawKey];
        }
      }
    });

    if (this.currentSymbol) {
      this.renderElement(this.currentSymbol);
    }
  }

  open(symbol) {
    this.currentSymbol = symbol;
    this.card.classList.remove("collapsed");
    this.card.classList.add("open");
    this.card.setAttribute("data-mode", this.currentView || "info");
    this.card.setAttribute("data-type", elementsData[symbol]?.Series || "");
    this.card.style.transform = ""; // Reset drag offset
    if (this.backdrop) this.backdrop.classList.add("open");
    audioEngine.playOpen();

    this.renderElement(symbol);
    this.switchView(this.currentView || "info");

    // Scroll to top
    const infoView = this.card.querySelector('.card-view[data-view="info"]');
    if (infoView) infoView.scrollTop = 0;
  }

  close() {
    this.card.classList.remove("open");
    this.card.classList.add("collapsed");
    if (this.backdrop) this.backdrop.classList.remove("open");
    audioEngine.playClose();
    if (this.bohrModel) this.bohrModel.stop();
  }

  switchView(view) {
    this.currentView = view;
    this.card.setAttribute("data-mode", view);
    audioEngine.playTab();

    // Update active tab buttons
    this.card.querySelectorAll(".cardViewSwitch").forEach(t => {
      if (t.dataset.item === view) t.classList.add("active");
      else t.classList.remove("active");
    });

    // Cleanly toggle views
    this.card.querySelectorAll(".card-view").forEach(v => {
      if (v.dataset.view === view) {
        v.classList.remove("hidden");
        v.style.display = view === "photo" ? "flex" : "block";
      } else {
        v.classList.add("hidden");
        v.style.display = "none";
      }
    });

    if (view === "info") {
      if (this.bohrModel && this.currentSymbol) {
        this.bohrModel.setElement(elementsData[this.currentSymbol]);
      }
    } else if (view === "3d") {
      this.init3DView();
    } else if (view === "photo") {
      this.renderPhotoView(this.currentSymbol);
    }
  }

  renderElement(symbol) {
    const data = elementsData[symbol];
    if (!data) return;

    const isZh = this.currentLang === "zh";
    const zh = elementZh[symbol] || { name: data.Name, pinyin: "", series: data.Series };
    const seriesText = isZh ? (seriesNames.zh[data.Series] || data.Series) : (seriesNames.en[data.Series] || data.Series);

    // Update Tab Switch buttons to pure Chinese or pure English
    const tabInfo = this.card.querySelector('.cardViewSwitch[data-item="info"]');
    if (tabInfo) tabInfo.textContent = uiText[this.currentLang]?.infoTab || (isZh ? "详情参数" : "Info");

    const tabPhoto = this.card.querySelector('.cardViewSwitch[data-item="photo"]');
    if (tabPhoto) tabPhoto.textContent = uiText[this.currentLang]?.photoTab || (isZh ? "实物标本" : "Photo");

    const tab3D = this.card.querySelector('.cardViewSwitch[data-item="3d"]');
    if (tab3D) tab3D.textContent = uiText[this.currentLang]?.threeDTab || "3D";

    // Update Section Group Titles to pure Chinese or pure English
    const groups = this.card.querySelectorAll(".group");
    groups.forEach(g => {
      const titleEl = g.querySelector(".title");
      if (titleEl) {
        const rawKey = titleEl.dataset.i18n || titleEl.textContent.trim();
        if (groupTitles[this.currentLang] && groupTitles[this.currentLang][rawKey]) {
          titleEl.textContent = groupTitles[this.currentLang][rawKey];
        }
      }
    });

    // Header values - Strictly structured with Ruby Pinyin & English IPA
    const ipa = elementIpa[symbol] || "";
    const mainGroup = this.card.querySelector('.group[data-group="main"]');
    if (mainGroup) {
      const numEl = mainGroup.querySelector('.property[data-property="Atomic Number"]');
      if (numEl) {
        numEl.innerHTML = `<span class="atom-num-badge">No. ${data["Atomic Number"]}</span> <span class="atom-series-badge">${seriesText}</span>`;
      }

      const symEl = mainGroup.querySelector('.property[data-property="Symbol"]');
      if (symEl) {
        symEl.textContent = symbol;
      }

      const nameEl = mainGroup.querySelector('.property[data-property="Name"]');
      if (nameEl) {
        if (isZh) {
          nameEl.innerHTML = `
            <div class="name-bilingual-row">
              <ruby class="main-character-ruby">${zh.name}<rt class="main-pinyin-rt">${zh.pinyin}</rt></ruby>
              <div class="main-transcription-wrap">
                <span class="main-en-name">${data.Name}</span>
                <span class="main-en-ipa">${ipa}</span>
              </div>
            </div>
          `;
        } else {
          nameEl.innerHTML = `
            <div class="name-bilingual-row">
              <span class="main-en-name primary">${data.Name}</span>
              <span class="main-en-ipa">${ipa}</span>
              <ruby class="main-character-ruby secondary">${zh.name}<rt class="main-pinyin-rt">${zh.pinyin}</rt></ruby>
            </div>
          `;
        }
      }

      const weightEl = mainGroup.querySelector('.property[data-property="Atomic Weight"]');
      if (weightEl) {
        weightEl.innerHTML = `<span class="weight-label">${isZh ? "标准相对原子质量" : "Standard Atomic Weight"}:</span> <span class="weight-val">${data["Atomic Weight"]} u</span>`;
      }

      const generalInfo = mainGroup.querySelector('.property[data-property="General Info"] .property-value');
      if (generalInfo) {
        generalInfo.textContent = getElementDescription(symbol, this.currentLang, data, zh);
      }
    }

    // Summary Group
    this.updateProperty("Symbol", symbol);
    if (isZh) {
      this.updateProperty("Name", `<ruby class="summary-ruby">${zh.name}<rt class="summary-pinyin">${zh.pinyin}</rt></ruby> (${data.Name} <span class="summary-ipa">${ipa}</span>)`);
    } else {
      this.updateProperty("Name", `${data.Name} <span class="summary-ipa">${ipa}</span> (${zh.name} ${zh.pinyin})`);
    }
    this.updateProperty("Latin Name", data["Latin Name"] || symbol);
    this.updateProperty("Series", seriesText);
    this.updateProperty("Atomic Weight", `${data["Atomic Weight"]} u`);
    this.updateProperty("Atomic Number", data["Atomic Number"]);
    this.updateProperty("Period", data.Period);
    this.updateProperty("Group", data.Group);
    this.updateProperty("Block", data.Block);
    this.updateProperty("Valence", data.Valence || "—");
    this.updateProperty("Oxidation States", data["Oxidation States"] || "—");
    this.updateProperty("Color", translateValue(data.Color, this.currentLang) || "—");
    this.updateProperty("Discovery", translateDiscovery(data.Discovery, this.currentLang) || "—");

    // Atomic Properties Group
    this.updateProperty("Lewis Symbol", data["Lewis Symbol"] || symbol);
    this.updateProperty("Electron Configuration", data["Electron Configuration"] || "—");
    this.updateProperty("Electrons", data.Electrons || data["Atomic Number"]);
    this.updateProperty("Protons", data.Protons || data["Atomic Number"]);
    this.updateProperty("Neutrons", data.Neutrons || "—");
    this.updateProperty("Mass Number", data["Mass Number"] || "—");
    this.updateProperty("Electrons per Shell", data["Electrons per Shell"] || "—");
    this.updateProperty("Quantum Numbers", data["Quantum Numbers"] || "—");
    this.updateProperty("Atomic Radius", data["Atomic Radius"] || "—");
    this.updateProperty("Covalent Radius", data["Covalent Radius"] || "—");
    this.updateProperty("Van der Waals Radius", data["Van der Waals Radius"] || "—");

    // Init/Update Bohr 2D Model
    let bohrContainer = this.card.querySelector(".bohr-2d-wrapper");
    if (!bohrContainer) {
      const bohrProp = this.card.querySelector('.property[data-property="Bohr 2D Model"]');
      if (bohrProp) {
        bohrProp.innerHTML = "";
        bohrContainer = document.createElement("div");
        bohrContainer.className = "bohr-2d-wrapper";
        bohrProp.appendChild(bohrContainer);
        this.bohrModel = new BohrModel2D(bohrContainer);
      }
    }
    if (this.bohrModel) {
      this.bohrModel.setElement(data);
    }

    // Thermal Properties Group
    this.updateProperty("Phase", translateValue(data.Phase, this.currentLang) || "—");
    this.updateTemperature("Melting Point", data["Absolute Melting Point"]);
    this.updateTemperature("Boiling Point", data["Absolute Boiling Point"]);
    this.updateProperty("Heat of Fusion", data["Heat of Fusion"] || "—");
    this.updateProperty("Heat of Vaporization", data["Heat of Vaporization"] || "—");
    this.updateProperty("Specific Heat", data["Specific Heat"] || "—");

    // Material Properties
    this.updateProperty("Density", data.Density || "—");
    this.updateProperty("Liquid Density", data["Liquid Density"] || "—");
    this.updateProperty("Molar Volume", data["Molar Volume"] || "—");
    this.updateProperty("Speed of Sound", data["Speed of Sound"] || "—");
    this.updateProperty("Thermal Expansion", data["Thermal Expansion"] || "—");
    this.updateProperty("Thermal Conductivity", data["Thermal Conductivity"] || "—");
    this.updateProperty("Poisson Ratio", data["Poisson Ratio"] || "—");
    this.updateProperty("Crystal Structure", translateValue(data["Crystal Structure"], this.currentLang) || "—");
    this.updateProperty("Mohs Hardness", data["Mohs Hardness"] || "—");
    this.updateProperty("Vickers Hardness", data["Vickers Hardness"] || "—");
    this.updateProperty("Brinell Hardness", data["Brinell Hardness"] || "—");

    // Electromagnetic Properties
    this.updateProperty("Electrical Type", translateValue(data["Electrical Type"], this.currentLang) || "—");
    this.updateProperty("Magnetic Type", translateValue(data["Magnetic Type"], this.currentLang) || "—");
    this.updateProperty("Resistivity", data.Resistivity || "—");
    this.updateProperty("Electrical Conductivity", data["Electrical Conductivity"] || "—");
    this.updateProperty("Curie Point", data["Curie Point"] || "—");

    // Spectral Lines
    const spectreBox = this.card.querySelector(".spectreImage");
    if (spectreBox) {
      const specUrl = data["Spectral Lines"];
      if (specUrl && specUrl !== "N/A") {
        spectreBox.innerHTML = `<div class="spectral-line-box"><img src="https://www.talbica.com/${specUrl}" alt="${symbol} spectrum"></div>`;
        this.card.querySelector('.property[data-property="Spectral Lines"]')?.classList.remove("hidden");
      } else {
        this.card.querySelector('.property[data-property="Spectral Lines"]')?.classList.add("hidden");
      }
    }

    // Chemical Properties
    this.updateProperty("Electronegativity", data.Electronegativity || "—");
    this.updateProperty("ElectronAffinity", data.ElectronAffinity || "—");
    this.updateProperty("First Ionization Energy", data["First Ionization Energy"] || "—");
    this.updateProperty("Second Ionization Energy", data["Second Ionization Energy"] || "—");
    this.updateProperty("Third Ionization Energy", data["Third Ionization Energy"] || "—");

    // Abundance Properties
    this.updateProperty("% in Universe", data["% in Universe"] || "—");
    this.updateProperty("% in Sun", data["% in Sun"] || "—");
    this.updateProperty("% in Meteorites", data["% in Meteorites"] || "—");
    this.updateProperty("% in Earth's Crust", data["% in Earth's Crust"] || "—");
    this.updateProperty("% in Oceans", data["% in Oceans"] || "—");
    this.updateProperty("% in Humans", data["% in Humans"] || "—");

    // Nuclear Properties
    this.updateProperty("Radioactivity", translateValue(data.Radioactivity, this.currentLang) || "—");
    this.updateProperty("Half-Life Text", data["Half-Life Text"] || data["Half-Life"] || "—");
    this.updateProperty("Neutron Cross Section", data["Neutron Cross Section"] || "—");
    this.updateProperty("Neutron Mass Absorption", data["Neutron Mass Absorption"] || "—");
    this.updateProperty("Stable Isotopes", data["Stable Isotopes"] || "—");
    this.updateProperty("Known Isotopes", data["Known Isotopes"] || "—");

    // Update Photo & 3D tabs if active
    if (this.currentView === "photo") this.renderPhotoView(symbol);
    if (this.currentView === "3d") this.init3DView();
  }

  updateProperty(propName, value) {
    const propEls = this.card.querySelectorAll(`.group:not([data-group="main"]) .property[data-property="${propName}"]`);
    propEls.forEach(el => {
      const valEl = el.querySelector(".property-value") || el;
      if (valEl) {
        valEl.innerHTML = formatPropertyValue(value, this.currentLang);
      }

      const nameEl = el.querySelector(".property-name");
      if (nameEl) {
        nameEl.textContent = propertyDict[this.currentLang]?.[propName] || propName;
      }
    });
  }

  updateTemperature(propName, kelvinStr) {
    const el = this.card.querySelector(`.property[data-property="${propName}"]`);
    if (!el) return;

    const valEl = el.querySelector(".property-value");
    const kVal = parseFloat(String(kelvinStr || "").replace(/[^0-9.]/g, ""));

    if (isNaN(kVal) || !kVal) {
      if (valEl) valEl.textContent = "—";
      return;
    }

    let displayVal = `${kVal} K`;
    if (this.tempUnit === "C") {
      const cVal = (kVal - 273.15).toFixed(2);
      displayVal = `${cVal} °C`;
    } else if (this.tempUnit === "F") {
      const fVal = ((kVal - 273.15) * 1.8 + 32).toFixed(2);
      displayVal = `${fVal} °F`;
    }

    if (valEl) valEl.textContent = displayVal;

    // Unit toggle buttons
    const tabs = el.querySelectorAll(".button");
    tabs.forEach(btn => {
      const unit = btn.dataset.button;
      btn.onclick = () => {
        this.tempUnit = unit === "tempC" ? "C" : unit === "tempF" ? "F" : "K";
        this.renderElement(this.currentSymbol);
      };
      if (
        (this.tempUnit === "C" && unit === "tempC") ||
        (this.tempUnit === "K" && unit === "tempK") ||
        (this.tempUnit === "F" && unit === "tempF")
      ) {
        btn.classList.add("active");
        btn.classList.remove("inactive");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  renderPhotoView(symbol) {
    const photoContainer = this.card.querySelector("#photo");
    const photoInfoText = this.card.querySelector(".photoInfoText");
    const photoAuthor = this.card.querySelector(".photoInfoAuthor");

    const photoMeta = mediaData?.Photos?.[symbol];
    const defaultUrl = `https://www.talbica.com/Elements/Photos/${symbol}/${symbol}.jpg`;

    if (photoContainer) {
      photoContainer.style.backgroundImage = `url("${defaultUrl}")`;
      photoContainer.style.backgroundSize = "contain";
      photoContainer.style.backgroundRepeat = "no-repeat";
      photoContainer.style.backgroundPosition = "center";
      photoContainer.style.minHeight = "360px";
      photoContainer.style.width = "100%";
    }

    if (photoMeta) {
      const meta = Array.isArray(photoMeta) ? photoMeta[0] : photoMeta;
      if (photoInfoText) photoInfoText.textContent = meta.text || "";
      if (photoAuthor) photoAuthor.textContent = `Photo: ${meta.copy || "Talbica"}`;
    }
  }

  init3DView() {
    let threeContainer = this.card.querySelector(".three-viewport");
    if (!threeContainer) {
      const wrapper = this.card.querySelector("#model3dWrapper");
      if (wrapper) {
        wrapper.innerHTML = "";
        threeContainer = document.createElement("div");
        threeContainer.className = "three-viewport";
        wrapper.appendChild(threeContainer);

        // Add controls bar
        const controls = document.createElement("div");
        controls.className = "three-controls-bar";
        const isZh = this.currentLang === "zh";
        controls.innerHTML = `
          <button class="three-btn active" data-light="night">${isZh ? "夜间光照" : "Night"}</button>
          <button class="three-btn" data-light="day">${isZh ? "日间光照" : "Day"}</button>
        `;
        threeContainer.appendChild(controls);

        controls.querySelectorAll(".three-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            controls.querySelectorAll(".three-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (this.threeView) this.threeView.setLighting(btn.dataset.light);
          });
        });

        this.threeView = new ElementThreeView(threeContainer);
      }
    }

    if (this.threeView && this.currentSymbol) {
      this.threeView.setElement(elementsData[this.currentSymbol]);
    }
  }
}
