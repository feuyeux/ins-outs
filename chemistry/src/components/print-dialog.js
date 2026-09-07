// Print & Export Periodic Table Modal
import { uiText } from "../data/translations.js";
import audioEngine from "../audio/audio-engine.js";

export class PrintDialog {
  constructor(dialogEl, backdropEl) {
    this.dialog = dialogEl;
    this.backdrop = backdropEl;
    this.currentLang = localStorage.getItem("talbica_lang") || "zh";

    this.init();
  }

  init() {
    const closeBtn = this.dialog.querySelector(".print-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener("click", () => this.close());
    }

    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && this.dialog.classList.contains("open")) this.close();
    });

    const options = this.dialog.querySelectorAll(".print-card");
    options.forEach(opt => {
      opt.addEventListener("click", () => {
        const format = opt.dataset.format;
        audioEngine.playTab();
        this.close();
        setTimeout(() => {
          window.print();
        }, 300);
      });
    });
  }

  setLanguage(lang) {
    this.currentLang = lang;
    const t = uiText[lang];
    if (t) {
      this.dialog.querySelector(".dialog-title").textContent = t.downloadPrint;
      this.dialog.querySelector(".print-subtitle").textContent = t.printSubtitle;
    }
  }

  open() {
    this.dialog.classList.add("open");
    this.dialog.setAttribute("aria-hidden", "false");
    this.dialog.setAttribute("role", "dialog");
    this.dialog.setAttribute("aria-modal", "true");
    document.body.classList.add("modal-open");
    if (this.backdrop) this.backdrop.classList.add("open");
    audioEngine.playOpen();
  }

  close() {
    this.dialog.classList.remove("open");
    this.dialog.setAttribute("aria-hidden", "true");
    if (!document.querySelector("#card.open:not(.collapsed), #reactionsResultModal.open")) document.body.classList.remove("modal-open");
    if (this.backdrop) this.backdrop.classList.remove("open");
    audioEngine.playClose();
  }
}
