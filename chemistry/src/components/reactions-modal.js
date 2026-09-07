// Reactions and Equation Solver Modal
import { balanceEquation, solveReaction, popularReactions } from "./smart-field.js";
import { uiText } from "../data/translations.js";
import audioEngine from "../audio/audio-engine.js";

export class ReactionsModal {
  constructor(modalElement, backdropElement) {
    this.modal = modalElement;
    this.backdrop = backdropElement;
    this.currentLang = localStorage.getItem("talbica_lang") || "zh";

    this.init();
  }

  init() {
    const closeBtn = this.modal.querySelector(".reaction-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener("click", () => this.close());
    }

    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && this.modal.classList.contains("open")) {
        this.close();
      }
    });
  }

  setLanguage(lang) {
    this.currentLang = lang;
  }

  open() {
    this.modal.classList.add("open");
    this.modal.setAttribute("aria-hidden", "false");
    this.modal.setAttribute("role", "dialog");
    this.modal.setAttribute("aria-modal", "true");
    document.body.classList.add("modal-open");
    if (this.backdrop) this.backdrop.classList.add("open");
  }

  close() {
    this.modal.classList.remove("open");
    this.modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector("#card.open:not(.collapsed), #printDialogCustom.open")) document.body.classList.remove("modal-open");
    if (this.backdrop) this.backdrop.classList.remove("open");
    audioEngine.playClose();
  }

  showBalanceResult(inputStr) {
    const t = uiText[this.currentLang];
    const result = balanceEquation(inputStr);

    this.modal.querySelector(".reaction-modal-title").textContent = t.balancedEquation;

    if (result) {
      audioEngine.playBalance();
      this.modal.querySelector(".reaction-equation-box").textContent = result.balancedEquation;
      this.modal.querySelector(".reaction-desc").innerHTML = `
        <strong>${t.coefficientsFound}</strong> ${result.coeffs.join(" : ")}<br>
        <span style="opacity:0.8; font-size:13px;">${t.noReactionFound}</span>
      `;
    } else {
      this.modal.querySelector(".reaction-equation-box").textContent = inputStr;
      this.modal.querySelector(".reaction-desc").textContent =
        this.currentLang === "zh"
          ? "未能成功配平方程式，请检查反应物和生成物化学式书写是否规范（如 H2 + O2 = H2O）。"
          : "Could not balance this equation. Please check chemical formulas syntax (e.g. H2 + O2 = H2O).";
    }

    this.open();
  }

  showSolveResult(inputStr) {
    const t = uiText[this.currentLang];
    const solved = solveReaction(inputStr);

    this.modal.querySelector(".reaction-modal-title").textContent = t.reactionTitle;

    if (solved) {
      audioEngine.playBalance();
      this.modal.querySelector(".reaction-equation-box").textContent = solved.equation;
      const title = this.currentLang === "zh" ? solved.nameZh : solved.nameEn;
      const desc = this.currentLang === "zh" ? solved.descZh : solved.descEn;
      this.modal.querySelector(".reaction-desc").innerHTML = `
        <div style="font-size:16px; font-weight:700; color:#fff; margin-bottom:6px;">${title}</div>
        <div>${desc}</div>
      `;
    } else {
      // Fallback to balance if '=' or '->' is in input
      if (inputStr.includes("=") || inputStr.includes("->") || inputStr.includes("→")) {
        return this.showBalanceResult(inputStr);
      }
      this.modal.querySelector(".reaction-equation-box").textContent = inputStr;
      this.modal.querySelector(".reaction-desc").textContent =
        this.currentLang === "zh"
          ? "未在基础反应库中检索到完全匹配的反应物组合。建议输入完整未配平方程式（如 Fe + Cl2 = FeCl3）使用配平功能！"
          : "No exact match found in popular reactions database. Try typing full unbalanced equation (e.g. Fe + Cl2 = FeCl3) to balance!";
    }

    this.open();
  }
}
