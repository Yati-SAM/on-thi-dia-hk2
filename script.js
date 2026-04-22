const STORAGE_KEY = "on-dia-hkii-scoreboard";

const retryWrongBtn = document.querySelector("#retryWrongBtn");
const showAnswersBtn = document.querySelector("#showAnswersBtn");
const submitBtn = document.querySelector("#submitBtn");
const resetBtn = document.querySelector("#resetBtn");
const floatingSubmitBtn = document.querySelector("#floatingSubmitBtn");
const scrollTopBtn = document.querySelector("#scrollTopBtn");
const quizContainer = document.querySelector("#quizContainer");
const resultCard = document.querySelector("#resultCard");
const sessionTitle = document.querySelector("#sessionTitle");
const sessionSubtitle = document.querySelector("#sessionSubtitle");
const sessionCount = document.querySelector("#sessionCount");
const lastScore = document.querySelector("#lastScore");
const bestScore = document.querySelector("#bestScore");
const chipTotalQuestions = document.querySelector("#chipTotalQuestions");
const chipMcq = document.querySelector("#chipMcq");
const chipTf = document.querySelector("#chipTf");

const allQuestions = flattenQuestions(window.QUIZ_DATA?.topics || []);

const state = {
  questions: [],
  answers: {},
  submitted: false,
  revealAnswers: false,
  wrongQuestionIds: [],
  wrongStatementCount: 0,
  instantCheck: false,
};

updateOverview();
restoreScores();

retryWrongBtn.addEventListener("click", retryWrongQuestions);
showAnswersBtn.addEventListener("click", () => {
  state.revealAnswers = !state.revealAnswers;
  showAnswersBtn.textContent = state.revealAnswers ? "Ẩn đáp án" : "Hiện đáp án";
  renderQuiz();
});
submitBtn.addEventListener("click", submitQuiz);
floatingSubmitBtn.addEventListener("click", submitQuiz);
resetBtn.addEventListener("click", () => {
  state.answers = {};
  state.submitted = false;
  resultCard.classList.add("hidden");
  renderQuiz();
});
scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function flattenQuestions(topics) {
  return topics.flatMap((topic, topicIndex) => {
    const mcqItems = topic.mcq.map((question) => ({
      id: `mcq-${topicIndex}-${question.number}`,
      type: "mcq",
      topicIndex,
      topicTitle: topic.title,
      sourceNumber: question.number,
      prompt: question.prompt,
      options: question.options,
      answer: question.answer,
    }));

    const tfItems = topic.tf.map((question) => ({
      id: `tf-${topicIndex}-${question.number}`,
      type: "tf",
      topicIndex,
      topicTitle: topic.title,
      sourceNumber: question.number,
      context: question.context,
      statements: question.statements,
    }));

    return [...mcqItems, ...tfItems];
  });
}

function updateOverview() {
  const mcqCount = allQuestions.filter((item) => item.type === "mcq").length;
  const tfStatementCount = allQuestions
    .filter((item) => item.type === "tf")
    .reduce((sum, item) => sum + item.statements.length, 0);
  chipTotalQuestions.textContent = `${allQuestions.length} nhóm câu`;
  chipMcq.textContent = `${mcqCount} câu ABCD`;
  chipTf.textContent = `${tfStatementCount} mệnh đề đúng/sai`;
}

function buildQuiz(sourceQuestions = null) {
  const chosen = sourceQuestions || defaultQuestions();
  state.questions = chosen;
  state.answers = {};
  state.submitted = false;
  state.wrongQuestionIds = [];
  state.wrongStatementCount = 0;
  resultCard.classList.add("hidden");

  sessionCount.textContent = `${chosen.length}`;
  submitBtn.disabled = chosen.length === 0;
  floatingSubmitBtn.disabled = chosen.length === 0;
  resetBtn.disabled = chosen.length === 0;
  retryWrongBtn.disabled = true;

  if (chosen.length === 0) {
    sessionTitle.textContent = "Không tìm thấy câu phù hợp";
    sessionSubtitle.textContent = "Thử đổi bài, dạng câu hoặc từ khóa để lấy thêm câu hỏi.";
    quizContainer.innerHTML = `
      <div class="empty-state">
        <h3>Chưa có câu nào khớp</h3>
        <p>Ví dụ: xóa bớt từ khóa tìm kiếm hoặc chuyển sang “Tất cả các bài”.</p>
      </div>
    `;
    return;
  }

  const mcqCount = chosen.filter((item) => item.type === "mcq").length;
  const tfCount = chosen.filter((item) => item.type === "tf").length;
  sessionTitle.textContent = `Bộ luyện: ${chosen.length} nhóm câu`;
  sessionSubtitle.textContent = `${mcqCount} câu ABCD và ${tfCount} câu đúng/sai đã sẵn sàng.`;
  renderQuiz();
}

function retryWrongQuestions() {
  if (state.wrongQuestionIds.length === 0) {
    return;
  }
  const retrySet = allQuestions.filter((item) => state.wrongQuestionIds.includes(item.id));
  buildQuiz(retrySet);
}

function defaultQuestions() {
  return shuffle([...allQuestions]);
}

function renderQuiz() {
  if (state.questions.length === 0) {
    return;
  }

  quizContainer.innerHTML = state.questions
    .map((question, index) => {
      return question.type === "mcq"
        ? renderMcq(question, index)
        : renderTrueFalse(question, index);
    })
    .join("");

  bindInputs();
}

function renderMcq(question, index) {
  const selected = state.answers[question.id];
  const showFeedback = state.submitted || state.revealAnswers;
  const isCorrect = selected === question.answer;
  const cardClass = state.submitted ? (isCorrect ? "question-card correct" : "question-card wrong") : "question-card";

  const optionsMarkup = Object.entries(question.options)
    .map(([letter, text]) => {
      const checked = selected === letter ? "checked" : "";
      const correctClass = showFeedback && letter === question.answer ? "correct-answer" : "";
      const wrongClass = state.submitted && selected === letter && letter !== question.answer ? "wrong-answer" : "";
      return `
        <div class="option-item ${correctClass} ${wrongClass}">
          <label>
            <input type="radio" name="${question.id}" value="${letter}" data-question-id="${question.id}" ${checked}>
            <span class="option-letter">${letter}</span>
            <span class="option-text">${escapeHtml(text)}</span>
          </label>
        </div>
      `;
    })
    .join("");

  return `
    <article class="${cardClass}">
      <div class="question-top">
        <span class="badge topic">${escapeHtml(question.topicTitle)}</span>
        <span class="badge type">Câu ${question.sourceNumber} • ABCD</span>
        <span class="badge">#${index + 1}</span>
      </div>
      <h3 class="question-title">${escapeHtml(question.prompt)}</h3>
      <div class="option-list">${optionsMarkup}</div>
      ${renderMcqFeedback(question, selected)}
    </article>
  `;
}

function renderMcqFeedback(question, selected) {
  if (!state.submitted && !state.revealAnswers) {
    return "";
  }

  const answerText = question.options[question.answer] || "";
  if (state.submitted) {
    const correct = selected === question.answer;
    return `
      <div class="feedback ${correct ? "good" : "bad"}">
        <strong>${correct ? "Chính xác" : "Chưa đúng"}</strong>
        <div>Đáp án đúng: <b>${question.answer}</b>. ${escapeHtml(answerText)}</div>
      </div>
    `;
  }

  return `
    <div class="feedback muted">
      <strong>Đáp án gốc</strong>
      <div><b>${question.answer}</b>. ${escapeHtml(answerText)}</div>
    </div>
  `;
}

function renderTrueFalse(question, index) {
  const currentAnswers = state.answers[question.id] || {};
  const checkedAll = question.statements.every((statement) => typeof currentAnswers[statement.label] === "boolean");
  const correctAll = question.statements.every(
    (statement) => currentAnswers[statement.label] === statement.answer
  );
  const cardClass = state.submitted
    ? `question-card ${checkedAll && correctAll ? "correct" : "wrong"}`
    : "question-card";

  const statementsMarkup = question.statements
    .map((statement) => {
      const current = currentAnswers[statement.label];
      const showFeedback = state.submitted || state.revealAnswers;
      const correctClass =
        showFeedback && current === statement.answer ? "correct-answer" : "";
      const wrongClass =
        state.submitted &&
        typeof current === "boolean" &&
        current !== statement.answer
          ? "wrong-answer"
          : "";

      return `
        <div class="tf-item ${correctClass} ${wrongClass}">
          <div class="tf-item-inner">
            <div class="option-text">
              <span class="statement-label">${statement.label.toUpperCase()}</span>
              <span class="statement-text">${escapeHtml(statement.text)}</span>
            </div>
            <div class="tf-buttons">
              <label class="choice-pill">
                <input
                  type="radio"
                  name="${question.id}-${statement.label}"
                  value="true"
                  data-question-id="${question.id}"
                  data-statement="${statement.label}"
                  ${current === true ? "checked" : ""}
                >
                <span>Đúng</span>
              </label>
              <label class="choice-pill">
                <input
                  type="radio"
                  name="${question.id}-${statement.label}"
                  value="false"
                  data-question-id="${question.id}"
                  data-statement="${statement.label}"
                  ${current === false ? "checked" : ""}
                >
                <span>Sai</span>
              </label>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <article class="${cardClass}">
      <div class="question-top">
        <span class="badge topic">${escapeHtml(question.topicTitle)}</span>
        <span class="badge type">Câu ${question.sourceNumber} • Đúng / Sai</span>
        <span class="badge">#${index + 1}</span>
      </div>
      <p class="question-context">${escapeHtml(question.context)}</p>
      <div class="tf-list">${statementsMarkup}</div>
      ${renderTrueFalseFeedback(question, currentAnswers)}
    </article>
  `;
}

function renderTrueFalseFeedback(question, currentAnswers) {
  if (!state.submitted && !state.revealAnswers) {
    return "";
  }

  const answerLine = question.statements
    .map((statement) => `${statement.label.toUpperCase()}: ${statement.answer ? "Đúng" : "Sai"}`)
    .join(" • ");

  if (state.submitted) {
    const correctCount = question.statements.filter(
      (statement) => currentAnswers[statement.label] === statement.answer
    ).length;

    return `
      <div class="feedback ${correctCount === question.statements.length ? "good" : "bad"}">
        <strong>Kết quả phần đúng / sai</strong>
        <div>Bạn đúng ${correctCount}/${question.statements.length} mệnh đề.</div>
        <div>Đáp án đúng: ${answerLine}</div>
      </div>
    `;
  }

  return `
    <div class="feedback muted">
      <strong>Đáp án gốc</strong>
      <div>${answerLine}</div>
    </div>
  `;
}

function bindInputs() {
  quizContainer.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("change", handleAnswerChange);
  });
}

function handleAnswerChange(event) {
  const input = event.target;
  const questionId = input.dataset.questionId;
  const question = state.questions.find((item) => item.id === questionId);

  if (!question) {
    return;
  }

  if (question.type === "mcq") {
    state.answers[questionId] = input.value;
  } else {
    state.answers[questionId] = {
      ...(state.answers[questionId] || {}),
      [input.dataset.statement]: input.value === "true",
    };
  }

  if (state.instantCheck) {
    renderQuiz();
  }
}

function submitQuiz() {
  state.submitted = true;

  let total = 0;
  let correct = 0;
  const wrongQuestionIds = new Set();

  state.questions.forEach((question) => {
    if (question.type === "mcq") {
      total += 1;
      if (state.answers[question.id] === question.answer) {
        correct += 1;
      } else {
        wrongQuestionIds.add(question.id);
      }
      return;
    }

    question.statements.forEach((statement) => {
      total += 1;
      if ((state.answers[question.id] || {})[statement.label] === statement.answer) {
        correct += 1;
      } else {
        wrongQuestionIds.add(question.id);
      }
    });
  });

  state.wrongQuestionIds = [...wrongQuestionIds];
  state.wrongStatementCount = total - correct;
  retryWrongBtn.disabled = state.wrongQuestionIds.length === 0;
  floatingSubmitBtn.disabled = state.questions.length === 0;

  const percent = total === 0 ? 0 : (correct / total) * 100;
  saveScores(percent);
  restoreScores(percent);
  renderResult(correct, total, percent);
  renderQuiz();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderResult(correct, total, percent) {
  resultCard.classList.remove("hidden");
  const rounded = percent.toFixed(1);
  resultCard.innerHTML = `
    <div class="result-head">
      <div>
        <h2>Kết quả bài làm</h2>
        <p class="muted">Chấm theo từng câu ABCD và từng mệnh đề đúng/sai.</p>
      </div>
      <div class="score-badge">${rounded}%</div>
    </div>
    <div class="result-meta">
      <span class="meta-item">Đúng ${correct}/${total}</span>
      <span class="meta-item">Sai ${total - correct}</span>
      <span class="meta-item">${state.wrongQuestionIds.length} nhóm câu cần ôn lại</span>
    </div>
  `;
}

function saveScores(percent) {
  const current = readScores();
  current.last = percent;
  current.best = Math.max(current.best || 0, percent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

function restoreScores(currentPercent = null) {
  const score = readScores();
  const last = currentPercent ?? score.last;
  lastScore.textContent = typeof last === "number" ? `${last.toFixed(1)}%` : "Chưa làm";
  bestScore.textContent = typeof score.best === "number" && score.best > 0 ? `${score.best.toFixed(1)}%` : "Chưa có";
}

function readScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

buildQuiz();
