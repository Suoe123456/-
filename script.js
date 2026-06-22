(function () {
  const searchForm = document.querySelector("#kb-search");
  const searchInput = document.querySelector("#kb-query");
  const resultsEl = document.querySelector("#kb-results");
  const suggestionButtons = document.querySelectorAll("[data-query]");

  if (!searchForm || !searchInput || !resultsEl) {
    return;
  }

  let knowledgeBase = [];

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const scoreEntry = (entry, query) => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return 0;
    }

    const question = normalize(entry.question);
    const answer = normalize(entry.answer);
    const category = normalize(entry.category);
    const keywords = (entry.keywords || []).map(normalize);

    let score = 0;

    if (question.includes(normalizedQuery)) score += 8;
    if (answer.includes(normalizedQuery)) score += 3;
    if (category.includes(normalizedQuery)) score += 3;

    keywords.forEach((keyword) => {
      if (!keyword) return;
      if (normalizedQuery.includes(keyword)) score += 5;
      if (keyword.includes(normalizedQuery)) score += 4;
    });

    for (const char of normalizedQuery) {
      if (question.includes(char)) score += 0.7;
      if (answer.includes(char)) score += 0.2;
    }

    return score;
  };

  const renderEmpty = (message) => {
    resultsEl.innerHTML = `
      <article class="kb-empty">
        <h3>${escapeHtml(message)}</h3>
        <p>可以换一个更短的关键词，例如“合同”“劳动合同”“合规”“证据”。知识库会继续扩充。</p>
      </article>
    `;
  };

  const renderResults = (query) => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      renderEmpty("请输入问题或关键词");
      return;
    }

    const matches = knowledgeBase
      .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (!matches.length) {
      renderEmpty("暂未匹配到答案");
      return;
    }

    resultsEl.innerHTML = matches
      .map(({ entry }) => {
        const steps = (entry.nextSteps || [])
          .map((step) => `<li>${escapeHtml(step)}</li>`)
          .join("");

        return `
          <article class="kb-result">
            <div class="kb-result-top">
              <span>${escapeHtml(entry.category)}</span>
              <strong>${escapeHtml(entry.question)}</strong>
            </div>
            <p>${escapeHtml(entry.answer)}</p>
            ${
              steps
                ? `<div class="kb-next"><b>建议下一步</b><ul>${steps}</ul></div>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  };

  const loadKnowledgeBase = async () => {
    try {
      const response = await fetch("knowledge-base.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Knowledge base request failed");
      }
      knowledgeBase = await response.json();
    } catch (error) {
      knowledgeBase = [];
      renderEmpty("知识库暂时无法加载");
    }
  };

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResults(searchInput.value);
  });

  suggestionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      searchInput.value = button.dataset.query || "";
      renderResults(searchInput.value);
      searchInput.focus();
    });
  });

  loadKnowledgeBase();
})();
