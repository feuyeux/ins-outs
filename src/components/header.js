// Header, Audio Popover, Theme, Language & Tools Component
import audioEngine from "../audio/audio-engine.js";
import { uiText } from "../data/translations.js";

export class Header {
  constructor({ onLanguageChange, onModeChange, onHeatmapChange, onPrintClick }) {
    this.onLanguageChange = onLanguageChange;
    this.onModeChange = onModeChange;
    this.onHeatmapChange = onHeatmapChange;
    this.onPrintClick = onPrintClick;

    this.currentLang = localStorage.getItem("talbica_lang") || "zh";
    this.currentTheme = localStorage.getItem("talbica_theme") || "dark";
    this.isAudioOpen = false;

    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.setupAudioPopover();
    this.setupLanguageToggle();
    this.setupThemeToggle();
    this.setupTableTools();
    this.setupPrintButton();
    this.updateTexts();
  }

  setupAudioPopover() {
    const audioBtn = document.getElementById("audioToggleBtn");
    const popover = document.getElementById("audioPopover");
    if (!audioBtn || !popover) return;

    audioBtn.addEventListener("click", e => {
      e.stopPropagation();
      audioEngine.ensureContext();
      this.isAudioOpen = !this.isAudioOpen;
      popover.classList.toggle("open", this.isAudioOpen);
    });

    document.addEventListener("click", e => {
      if (!popover.contains(e.target) && e.target !== audioBtn) {
        this.isAudioOpen = false;
        popover.classList.remove("open");
      }
    });

    // BGM Toggle
    const bgmToggle = document.getElementById("bgmToggleInput");
    if (bgmToggle) {
      bgmToggle.checked = audioEngine.bgmEnabled;
      bgmToggle.addEventListener("change", () => {
        audioEngine.toggleBGM();
      });
    }

    // SFX Toggle
    const sfxToggle = document.getElementById("sfxToggleInput");
    if (sfxToggle) {
      sfxToggle.checked = audioEngine.sfxEnabled;
      sfxToggle.addEventListener("change", () => {
        audioEngine.toggleSFX();
      });
    }

    // BGM Volume Slider
    const bgmSlider = document.getElementById("bgmVolumeSlider");
    if (bgmSlider) {
      bgmSlider.value = audioEngine.bgmVol * 100;
      bgmSlider.addEventListener("input", e => {
        audioEngine.setBGMVolume(e.target.value / 100);
      });
    }

    // SFX Volume Slider
    const sfxSlider = document.getElementById("sfxVolumeSlider");
    if (sfxSlider) {
      sfxSlider.value = audioEngine.sfxVol * 100;
      sfxSlider.addEventListener("input", e => {
        audioEngine.setSFXVolume(e.target.value / 100);
      });
    }

    // Master Volume Slider
    const masterSlider = document.getElementById("masterVolumeSlider");
    if (masterSlider) {
      masterSlider.value = audioEngine.masterVol * 100;
      masterSlider.addEventListener("input", e => {
        audioEngine.setMasterVolume(e.target.value / 100);
      });
    }
  }

  setupLanguageToggle() {
    const langBtns = document.querySelectorAll(".lang-btn");
    langBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const lang = btn.dataset.lang;
        if (this.currentLang === lang) return;
        this.currentLang = lang;
        localStorage.setItem("talbica_lang", this.currentLang);
        audioEngine.playTab();
        this.updateTexts();
        if (this.onLanguageChange) this.onLanguageChange(this.currentLang);
      });
    });
  }

  setupThemeToggle() {
    const themeBtn = document.getElementById("themeButton");
    if (!themeBtn) return;

    themeBtn.addEventListener("click", () => {
      this.currentTheme = this.currentTheme === "dark" ? "light" : "dark";
      this.applyTheme(this.currentTheme);
      audioEngine.playTab();
    });
  }

  setTheme(theme) {
    this.currentTheme = theme;
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme, "visible");
    localStorage.setItem("talbica_theme", theme);

    const themeBtn = document.getElementById("themeButton");
    if (themeBtn) {
      themeBtn.setAttribute("data-theme", theme);
      const isDark = theme === "dark";
      themeBtn.title = isDark ? (this.currentLang === "zh" ? "切换至浅色模式" : "Switch to Light Mode") : (this.currentLang === "zh" ? "切换至深色模式" : "Switch to Dark Mode");
      themeBtn.innerHTML = `<span class="theme-icon">${isDark ? "🌙" : "☀️"}</span>`;
    }
  }

  setupTableTools() {
    // Mode Switchers
    const modeColors = document.querySelector('.tableTool[data-tool="ModeColors"]');
    const modePhotos = document.querySelector('.tableTool[data-tool="ModePhotos"]');
    const heatmapsTool = document.querySelector('.tableTool[data-tool="Heatmaps"]');
    const actionsMenu = document.querySelector('.tableToolActions[data-actions="Heatmaps"]');

    if (modeColors) {
      modeColors.addEventListener("click", () => {
        document.querySelectorAll(".tableTool").forEach(t => t.classList.remove("active"));
        modeColors.classList.add("active");
        if (actionsMenu) {
          actionsMenu.classList.add("collapsed");
          actionsMenu.style.display = "none";
        }
        if (this.onModeChange) this.onModeChange("colors");
      });
    }

    if (modePhotos) {
      modePhotos.addEventListener("click", () => {
        document.querySelectorAll(".tableTool").forEach(t => t.classList.remove("active"));
        modePhotos.classList.add("active");
        if (actionsMenu) {
          actionsMenu.classList.add("collapsed");
          actionsMenu.style.display = "none";
        }
        if (this.onModeChange) this.onModeChange("photos");
      });
    }

    if (heatmapsTool) {
      heatmapsTool.addEventListener("click", e => {
        e.stopPropagation();
        if (actionsMenu) {
          actionsMenu.classList.toggle("collapsed");
          actionsMenu.style.display = actionsMenu.classList.contains("collapsed") ? "none" : "block";
        }
      });
    }

    // Close heatmap dropdown when clicking anywhere outside
    document.addEventListener("click", e => {
      if (actionsMenu && !actionsMenu.contains(e.target) && e.target !== heatmapsTool && !heatmapsTool?.contains(e.target)) {
        actionsMenu.classList.add("collapsed");
        actionsMenu.style.display = "none";
      }
    });

    // Heatmap Sub-items
    const heatmapItems = document.querySelectorAll(".tableToolAction");
    heatmapItems.forEach(item => {
      item.addEventListener("click", e => {
        e.stopPropagation();
        heatmapItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        const action = item.dataset.action;
        if (action === "Normal Mode") {
          document.querySelectorAll(".tableTool").forEach(t => t.classList.remove("active"));
          modeColors?.classList.add("active");
          if (this.onModeChange) this.onModeChange("colors");
        } else {
          document.querySelectorAll(".tableTool").forEach(t => t.classList.remove("active"));
          heatmapsTool?.classList.add("active");
          if (this.onHeatmapChange) this.onHeatmapChange(action);
        }

        if (actionsMenu) {
          actionsMenu.classList.add("collapsed");
          actionsMenu.style.display = "none";
        }
      });
    });
  }

  setupPrintButton() {
    const printBtn = document.getElementById("printButton");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        audioEngine.playTab();
        if (this.onPrintClick) this.onPrintClick();
      });
    }
  }

  updateTexts() {
    const isZh = this.currentLang === "zh";
    const t = uiText[this.currentLang];
    if (!t) return;

    // Header Title
    const titleEl = document.querySelector(".mainTitle");
    if (titleEl) {
      titleEl.innerHTML = `<img src="/assets/images/app-icon.png" alt="Ins-Outs">${t.appTitle}`;
    }

    // Language Segmented Control Active State
    document.querySelectorAll(".lang-btn").forEach(btn => {
      if (btn.dataset.lang === this.currentLang) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Audio Button
    const audioBtn = document.getElementById("audioToggleBtn");
    if (audioBtn) {
      audioBtn.innerHTML = `🔊 <span>${isZh ? "音效" : "Audio"}</span>`;
    }

    // Mode Buttons
    const colorTitle = document.querySelector('.tableTool[data-tool="ModeColors"] .tableToolTitle');
    if (colorTitle) colorTitle.textContent = t.colors;

    const photoTitle = document.querySelector('.tableTool[data-tool="ModePhotos"] .tableToolTitle');
    if (photoTitle) photoTitle.textContent = t.photos;

    const heatmapTitle = document.querySelector('.tableTool[data-tool="Heatmaps"] .tableToolTitle');
    if (heatmapTitle) heatmapTitle.textContent = t.heatmaps;

    // Print Button
    const printBtn = document.getElementById("printButton");
    if (printBtn) printBtn.textContent = isZh ? "打印" : "Print";

    // Theme Button Title
    const themeBtn = document.getElementById("themeButton");
    if (themeBtn) {
      const isDark = this.currentTheme === "dark";
      themeBtn.title = isDark ? (isZh ? "切换至浅色模式" : "Switch to Light Mode") : (isZh ? "切换至深色模式" : "Switch to Dark Mode");
    }

    // Audio Popover Labels
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (t[key]) el.textContent = t[key];
    });

    // Heatmap Dropdown Items
    const heatmapActionMap = {
      "Normal Mode": { zh: "标准模式", en: "Normal mode" },
      "Melting Point": { zh: "熔点", en: "Melting point" },
      "Boiling Point": { zh: "沸点", en: "Boiling point" },
      "Density": { zh: "密度", en: "Density" },
      "Atomic Weight": { zh: "相对原子质量", en: "Atomic weight" },
      "Atomic Radius": { zh: "原子半径", en: "Atomic radius" },
      "Electronegativity": { zh: "电负性", en: "Electronegativity" },
      "% in Universe": { zh: "宇宙丰度", en: "Abundance in Universe" },
      "% in Earth's Crust": { zh: "地壳丰度", en: "Abundance in Earth crust" },
      "Half-Life": { zh: "半衰期", en: "Half-life period" }
    };

    const heatmapTitleHeader = document.querySelector('.tableToolActions[data-actions="Heatmaps"] h3');
    if (heatmapTitleHeader) heatmapTitleHeader.textContent = isZh ? "热力图模式" : "Heatmaps";

    document.querySelectorAll(".tableToolAction").forEach(item => {
      const act = item.dataset.action;
      const textEl = item.querySelector(".table-tool-action-text");
      if (textEl && heatmapActionMap[act]) {
        textEl.textContent = isZh ? heatmapActionMap[act].zh : heatmapActionMap[act].en;
      }
    });

    // Legend Title
    const legendH1 = document.querySelector(".tableLegend h1");
    if (legendH1) legendH1.textContent = t.elementTypes;
    const legendH3 = document.querySelector(".tableLegend h3");
    if (legendH3) legendH3.textContent = t.elementTypes;

    // Glossary Title
    const glossH1 = document.querySelector(".glossary h1");
    if (glossH1) glossH1.textContent = t.glossary;
    const glossH3 = document.querySelector(".glossary h3");
    if (glossH3) glossH3.textContent = t.glossary;
  }
}
