// Chemistry Glossary Component (Bilingual English & Chinese)
import { glossaryZh } from "../data/translations.js";

export class Glossary {
  constructor(container) {
    this.container = container;
    this.currentLang = localStorage.getItem("talbica_lang") || "zh";
    this.render();
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.render();
  }

  render() {
    const title = this.container.querySelector("h1");
    const subTitle = this.container.querySelector("h3");
    if (title) title.textContent = this.currentLang === "zh" ? "化学术语表" : "Glossary";
    if (subTitle) subTitle.textContent = this.currentLang === "zh" ? "化学术语表" : "Glossary";

    const columnsContainer = this.container.querySelector(".glossary-columns");
    if (!columnsContainer) return;

    columnsContainer.innerHTML = "";

    Object.entries(glossaryZh).forEach(([termEn, info]) => {
      const div = document.createElement("div");
      const displayText = this.currentLang === "zh" ? info.zh : termEn;

      div.innerHTML = `
        <a href="https://${this.currentLang === "zh" ? "baike.baidu.com/item/" + encodeURIComponent(info.zh) : "en.wikipedia.org/wiki/" + encodeURIComponent(termEn)}" 
           target="_blank" 
           title="${info.desc}">
          ${displayText}
        </a>
      `;
      columnsContainer.appendChild(div);
    });
  }
}
