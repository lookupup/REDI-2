import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import "./styles.css";
import { actionKitById } from "./data/actionKits";
import { badgeById } from "./data/badges";
import { cover } from "./data/cover";
import { dimensions } from "./data/dimensions";
import { mainResultById } from "./data/mainResults";
import { formalQuestions, hiddenQuestions, q0, type Question, type QuestionOption } from "./data/questions";
import { calculateResult, type Answers, type CalculatedResult } from "./lib/scoring";
import { getSharedAnalyticsPayload, trackEvent } from "./analytics";

type Page = "cover" | "quiz" | "result";
type PopupType = "persona" | "action" | "hidden" | "save";
type SpecialResultId = "BLANK" | "ALLY" | "FREE";

type AppState = {
  page: Page;
  questionIndex: number;
  answers: Answers;
  activePopup: PopupType | null;
  specialResultId: SpecialResultId | null;
};

type ResultParts = {
  persona: (typeof mainResultById)[keyof typeof mainResultById];
  actionKit: (typeof actionKitById)[keyof typeof actionKitById];
  badges: Array<(typeof badgeById)[keyof typeof badgeById]>;
};

type SvgExportChip = {
  width: number;
  height: number;
  icon: string;
  text: string;
  background: string;
};

type SvgExportTitle = {
  width: number;
  height: number;
  icon: string;
  text: string;
};

const h = React.createElement;
const chipIcons = ["✷", "✦", "✧", "✹"];
const allQuestions: Question[] = [q0, ...formalQuestions, ...hiddenQuestions];
const q0QuestionIndex = allQuestions.findIndex((question) => question.id === "Q0");
const o1QuestionIndex = allQuestions.findIndex((question) => question.id === "O1");
const o2QuestionIndex = allQuestions.findIndex((question) => question.id === "O2");
const specialQuestionIds = ["Q0", "O1", "O2"];
const homePadImage = new URL("../assets/reference/home-pad-labeled.webp", import.meta.url).toString();
const q0DropImage = new URL("../assets/reference/q0-drop.webp", import.meta.url).toString();
const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const resultFlowerImage = publicAsset("images/flower.png");
const resultBracketLeftImage = publicAsset("images/result-bracket-left.png");
const resultBracketRightImage = publicAsset("images/result-bracket-right.png");
const resultDisclaimer = "*本测试仅为趣味互动工具，旨在帮助你觉察月经相关感受，不能作为医学诊断依据。如有持续周期异常、剧烈疼痛或其他不适，请及时前往正规医院咨询。";

const initialState: AppState = {
  page: "cover",
  questionIndex: 0,
  answers: {},
  activePopup: null,
  specialResultId: null
};

const q0SpecialResults: Record<string, SpecialResultId> = {
  A: "BLANK",
  E: "ALLY",
  F: "FREE"
};

const specialResults: Record<SpecialResultId, { name: string; englishName: string; body: string }> = {
  BLANK: {
    name: "潜力新星",
    englishName: "BLANK",
    body: "你正站在名为“成长”的后台，\n听着序曲，带着对未知的一丝好奇。\n属于你的剧本还是一片干净的留白，\n别着急，你的精彩开场，\n永远值得期待。"
  },
  ALLY: {
    name: "月经同盟",
    englishName: "ALLY",
    body: "你虽未亲身感受，\n但月经的故事一直都在你身边。\n期待你进一步探索有关月经的一切，\n直至你成为身边人最坚实的后援。"
  },
  FREE: {
    name: "旷野艺术家",
    englishName: "FREE",
    body: "有些身体不以周期为线索。\n有些经历本就不同于主流叙事。\n你的身体不需要符合任何模板，\n它自有风景。"
  }
};

const specialResultImages: Record<SpecialResultId, string> = {
  BLANK: publicAsset("images/personas/blank.webp"),
  ALLY: publicAsset("images/personas/ally.webp"),
  FREE: publicAsset("images/personas/free.webp")
};

const personaImages: Record<string, string> = {
  STAR: publicAsset("images/personas/star.webp"),
  STAR_HARD: publicAsset("images/personas/star-hard.webp"),
  WILD: publicAsset("images/personas/wild.webp"),
  WILD_HARD: publicAsset("images/personas/wild-hard.webp"),
  COACH: publicAsset("images/personas/coach.webp"),
  COACH_HARD: publicAsset("images/personas/coach-hard.webp"),
  NEWS: publicAsset("images/personas/news.webp"),
  NEWS_HARD: publicAsset("images/personas/news-hard.webp"),
  INVISIBLE: publicAsset("images/personas/invisible.webp"),
  INVISIBLE_HARD: publicAsset("images/personas/invisible-hard.webp"),
  // TODO: Confirm whether the project persona id SURPRISE should permanently use the RANGER image assets.
  SURPRISE: publicAsset("images/personas/ranger.webp"),
  SURPRISE_HARD: publicAsset("images/personas/ranger-hard.webp"),
  ASSASSIN: publicAsset("images/personas/assassin.webp"),
  ASSASSIN_HARD: publicAsset("images/personas/assassin-hard.webp"),
  OWL: publicAsset("images/personas/owl.webp"),
  OWL_HARD: publicAsset("images/personas/owl-hard.webp")
};

const dimensionSymbols: Record<string, string> = {
  P: "drop",
  E: "radio",
  R: "calendar",
  I: "bell",
  O: "quote",
  D: "notebook"
};

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function chipSvgDataUrl(chip: SvgExportChip) {
  const background = chip.background.includes("gradient")
    ? '<linearGradient id="chipBg" x1="0" x2="1" y1="0" y2="0"><stop stop-color="#fceaf8"/><stop offset="1" stop-color="#c8ecf3"/></linearGradient>'
    : "";
  const fill = chip.background.includes("gradient") ? 'url(#chipBg)' : chip.background;
  const iconX = 12;
  const textX = chip.icon ? 29 : 12;
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${chip.width}" height="${chip.height}" viewBox="0 0 ${chip.width} ${chip.height}">
      <defs>${background}</defs>
      <rect width="${chip.width}" height="${chip.height}" rx="${chip.height / 2}" fill="${fill}"/>
      ${chip.icon ? `<text x="${iconX}" y="${chip.height / 2}" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#111">${escapeSvgText(chip.icon)}</text>` : ""}
      <text x="${textX}" y="${chip.height / 2}" dominant-baseline="central" font-family="PingFang SC, Arial, sans-serif" font-size="12" font-weight="700" fill="#111">${escapeSvgText(chip.text)}</text>
    </svg>
  `);
}

function titleSvgDataUrl(title: SvgExportTitle) {
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${title.width}" height="${title.height}" viewBox="0 0 ${title.width} ${title.height}">
      <rect x="0" y="${(title.height - 15) / 2}" width="15" height="15" rx="5" fill="#fceaf8"/>
      <text x="7.5" y="${title.height / 2}" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="rgba(0,0,0,0.72)">${escapeSvgText(title.icon)}</text>
      <text x="22" y="${title.height / 2}" dominant-baseline="central" font-family="PingFang SC, Arial, sans-serif" font-size="15" font-weight="400" fill="rgba(0,0,0,0.58)">${escapeSvgText(title.text)}</text>
    </svg>
  `);
}

const hiddenSymbols: Record<string, string> = {
  H1: "stone",
  H2: "submarine",
  H3: "cup",
  H4: "megaphone"
};

function App() {
  const [state, setState] = React.useState<AppState>(initialState);
  const testStartedAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    trackEvent("page_view", getSharedAnalyticsPayload());
  }, []);

  const calculatedResult = React.useMemo(
    () => calculateResult(state.answers),
    [state.answers]
  );

  const answerQuestion = (question: Question, option: QuestionOption) => {
    setState((current) => {
      const nextAnswers = { ...current.answers, [question.id]: option.id };
      const selectedSpecialResultId = question.id === q0.id ? q0SpecialResults[option.id] : null;
      const isLastQuestion = current.questionIndex >= allQuestions.length - 1;

      if (selectedSpecialResultId) {
        return {
          ...current,
          answers: nextAnswers,
          page: "quiz",
          questionIndex: o1QuestionIndex,
          activePopup: null,
          specialResultId: selectedSpecialResultId
        };
      }

      if (current.specialResultId && question.id === "O1") {
        return {
          ...current,
          answers: nextAnswers,
          page: "quiz",
          questionIndex: o2QuestionIndex,
          activePopup: null
        };
      }

      if (current.specialResultId && question.id === "O2") {
        const specialResultId = current.specialResultId;
        const specialResult = specialResults[specialResultId];
        trackEvent("result_generated", {
          personality_result: specialResultId,
          personality_result_cn: specialResult.name,
          personality_result_en: specialResult.englishName,
          tips_result: "",
          badge_result: specialResultId,
          is_hidden_result: true,
          test_duration_seconds: testStartedAtRef.current ? Math.round((Date.now() - testStartedAtRef.current) / 1000) : 0,
          ...getSharedAnalyticsPayload()
        });
        return {
          ...current,
          answers: nextAnswers,
          page: "result",
          activePopup: null,
          specialResultId
        };
      }

      if (isLastQuestion) {
        const result = calculateResult(nextAnswers);
        const resultParts = getResultParts(result);
        trackEvent("result_generated", {
          personality_result: result.personaImageKey,
          personality_result_cn: resultParts.persona.name,
          personality_result_en: resultParts.persona.englishName,
          tips_result: result.actionKit.id,
          badge_result: result.badges.join(","),
          is_hidden_result: false,
          test_duration_seconds: testStartedAtRef.current ? Math.round((Date.now() - testStartedAtRef.current) / 1000) : 0,
          ...getSharedAnalyticsPayload()
        });
        return { ...current, answers: nextAnswers, page: "result", activePopup: null, specialResultId: null };
      }

      return {
        ...current,
        answers: nextAnswers,
        questionIndex: current.questionIndex + 1,
        specialResultId: null
      };
    });
  };

  const goToPreviousQuestion = () => {
    setState((current) => {
      if (current.specialResultId) {
        const currentQuestion = allQuestions[current.questionIndex];
        if (currentQuestion?.id === "O2") {
          return { ...current, questionIndex: o1QuestionIndex };
        }
        if (currentQuestion?.id === "O1") {
          return { ...current, questionIndex: q0QuestionIndex, specialResultId: null };
        }
      }

      return {
        ...current,
        questionIndex: Math.max(current.questionIndex - 1, 0)
      };
    });
  };

  const currentQuestion = allQuestions[state.questionIndex];
  const specialQuestionDisplayIndex = state.specialResultId
    ? specialQuestionIds.indexOf(currentQuestion.id)
    : -1;
  const questionDisplayIndex = specialQuestionDisplayIndex >= 0
    ? specialQuestionDisplayIndex
    : state.questionIndex;
  const questionDisplayTotal = specialQuestionDisplayIndex >= 0
    ? specialQuestionIds.length
    : allQuestions.length;

  return h(PhoneShell, null,
    state.page === "cover" && h(CoverPage, {
      onStart: () => {
        testStartedAtRef.current = Date.now();
        trackEvent("click_start", getSharedAnalyticsPayload());
        setState((current) => ({ ...current, page: "quiz" }));
      }
    }),
    state.page === "quiz" && h(QuestionPage, {
      question: currentQuestion,
      index: questionDisplayIndex,
      total: questionDisplayTotal,
      selectedAnswer: state.answers[currentQuestion.id],
      onAnswer: answerQuestion,
      onBack: goToPreviousQuestion
    }),
    state.page === "result" && state.specialResultId && h(SpecialResultPage, {
      resultId: state.specialResultId,
      result: specialResults[state.specialResultId],
      onRestart: () => setState(initialState)
    }),
    state.page === "result" && !state.specialResultId && h(FinalResultPage, {
      calculatedResult,
      activePopup: state.activePopup,
      onOpenPopup: (activePopup: PopupType) => {
        setState((current) => ({ ...current, activePopup }));
      },
      onClosePopup: () => setState((current) => ({ ...current, activePopup: null })),
      onRestart: () => setState(initialState)
    })
  );
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return h("div", { className: "app-shell w-full bg-white" },
    h("div", { className: "app-shell w-full overflow-hidden bg-white" }, children)
  );
}

function CoverPage({ onStart }: { onStart: () => void }) {
  return h("main", {
    className: "new-cover relative flex flex-col items-center overflow-hidden px-9 text-center",
  },
    h("div", { className: "cover-main" },
      h("section", { className: "relative z-10" },
        h("h1", { className: "text-[1.82rem] font-bold leading-tight text-black" },
          h("span", { className: "font-en" }, "REDI："),
          h("span", { className: "font-cn" }, "测测你的月经人格")
        ),
        h("p", { className: "mt-3 text-[1.32rem] leading-tight text-black/82" },
          h("span", { className: "font-cn" }, "你的月经，比"),
          h("span", { className: "font-en" }, "MBTI"),
          h("span", { className: "font-cn" }, "更懂你")
        )
      ),
      h("section", { className: "cover-hero-mark", "aria-hidden": "true" },
        h("img", { src: homePadImage, alt: "", className: "cover-hero-image" })
      ),
      h("section", { className: "cover-copy relative z-10 text-black/82" },
        h("p", null, "你有没有想过，月经其实是一位老朋友?"),
        h("p", null, "完成REDI 测试解锁你和月经的关系，", h("br"), "看看你的经期体验对应哪种人格、锦囊和特别勋章。")
      ),
      h("button", {
        type: "button",
        onClick: onStart,
        className: "cover-start-button",
        "aria-label": cover.cta
      },
        h("span", { className: "cover-start-pulse" }, cover.cta)
      )
    ),
    h("p", { className: "cover-footer-note" }, "*REDI：月经（RED）人格（Indicators）")
  );
}

function PhoneStatus() {
  return h("div", { className: "phone-status-spacer", "aria-hidden": "true" });
}

function QuestionPage({
  question,
  index,
  total,
  selectedAnswer,
  onAnswer,
  onBack
}: {
  question: Question;
  index: number;
  total: number;
  selectedAnswer?: string;
  onAnswer: (question: Question, option: QuestionOption) => void;
  onBack: () => void;
}) {
  const progress = Math.round(((index + 1) / total) * 100);
  const dimensionLabel = question.dimension
    ? dimensions[question.dimension].chineseName
    : question.type === "hidden" ? "隐藏题" : "暖场题｜不计分";
  const symbol = question.type === "hidden"
    ? hiddenSymbols[question.id] || "spark"
    : dimensionSymbols[question.dimension || ""] || "spark";
  const isWarmup = question.id === q0.id;
  const questionTitle = question.title.startsWith(`${question.id}｜`)
    ? question.title
    : `${question.id}. ${question.title}`;

  return h("main", { className: `question-page ${isWarmup ? "question-page-warmup" : ""} flex flex-col bg-white px-7 pb-8 pt-5` },
    h(PhoneStatus),
    h("header", { className: "question-header mt-7", "aria-label": "答题进度" },
      h("div", { className: "flex items-center justify-between text-xs font-medium text-moss" },
        h("span", null, dimensionLabel),
        h("span", null, `${index + 1}/${total}`)
      ),
      h("div", { className: "mt-3 h-1.5 rounded-full bg-[#e6e6e6]", "aria-hidden": "true" },
        h("div", {
          className: "h-full rounded-full bg-[#76d5de] transition-[width] motion-reduce:transition-none",
          style: { width: `${progress}%` }
        })
      )
    ),
    h("section", { className: "question-body flex flex-1 flex-col justify-center pb-10" },
      h("div", { className: "question-title-row mb-7 flex items-center gap-4" },
        h(Symbol, { type: symbol, className: "question-icon" }),
        h("p", { className: "font-cn text-left text-[1.08rem] leading-7 text-black" }, questionTitle)
      ),
      h("div", { className: "grid gap-5", role: "list", "aria-label": `${question.id} 选项` },
        question.options.map((option) => h("button", {
          key: option.id,
          type: "button",
          className: `question-option px-5 py-4 text-center leading-relaxed text-black outline-none transition focus-visible:ring-4 focus-visible:ring-[#9CA8B5]/35 ${selectedAnswer === option.id ? "question-option-selected" : ""}`,
          onClick: () => onAnswer(question, option),
          "aria-pressed": selectedAnswer === option.id
        },
          option.text
        ))
      ),
      index > 0 && h("button", {
        type: "button",
        onClick: onBack,
        className: "question-back",
        "aria-label": "返回上一题"
      }, "← 返回上一题"),
      isWarmup && h("div", { className: "q0-illustration", "aria-hidden": "true" },
        h("img", { src: q0DropImage, alt: "", className: "q0-drop-image" })
      )
    )
  );
}

function badgeLabel(option: QuestionOption) {
  const id = option.triggeredBadges[0];
  return id ? `${badgeById[id].name} · ${id}` : "无触发";
}

function useShareFeedback() {
  const [toastMessage, setToastMessage] = React.useState("");
  const copiedTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
  }, []);

  const shareResult = async () => {
    trackEvent("click_share", { source: "result_page", ...getSharedAnalyticsPayload() });
    trackEvent("copy_link", { source: "result_page", ...getSharedAnalyticsPayload() });

    let message = "✅已复制";
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const fallbackInput = document.createElement("textarea");
      fallbackInput.value = window.location.href;
      fallbackInput.setAttribute("readonly", "");
      fallbackInput.style.position = "fixed";
      fallbackInput.style.left = "-9999px";
      fallbackInput.style.top = "0";
      document.body.appendChild(fallbackInput);
      fallbackInput.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(fallbackInput);
      if (!copied) message = "复制失败，请手动复制链接";
    }

    setToastMessage(message);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setToastMessage(""), 3000);
  };

  return { toastMessage, shareResult };
}

function SpecialResultPage({
  resultId,
  result,
  onRestart
}: {
  resultId: SpecialResultId;
  result: { name: string; englishName: string; body: string };
  onRestart: () => void;
}) {
  const { toastMessage, shareResult } = useShareFeedback();
  const specialImage = specialResultImages[resultId];

  return h("main", { className: "special-result-page result-page result-page-redesign" },
    h("section", { className: "result-hero-panel special-hero-panel" },
      h(PhoneStatus),
      h("h1", { className: "result-title" }, `${result.name} · ${result.englishName}`),
      h("figure", { className: "special-character-stage" },
        h("img", {
          src: resultBracketLeftImage,
          alt: "",
          className: "result-deco result-deco-left",
          "aria-hidden": "true"
        }),
        h("img", {
          src: specialImage,
          alt: `${result.name} ${result.englishName}人格形象`,
          className: "special-result-avatar"
        }),
        h("img", {
          src: resultBracketRightImage,
          alt: "",
          className: "result-deco result-deco-right",
          "aria-hidden": "true"
        })
      )
    ),
    h("section", { className: "special-content-flow" },
      h("div", { className: "result-flower-divider", "aria-hidden": "true" },
        h("img", { src: resultFlowerImage, alt: "" })
      ),
      h("section", { className: "special-result-profile", "aria-label": "人格档案" },
        h("p", null, result.body)
      ),
      h("footer", { className: "special-result-actions" },
        h("button", {
          type: "button",
          onClick: shareResult,
          className: "result-footer-button result-footer-share"
        }, "复制链接分享")
      ),
      h(ResultDisclaimer),
      h("button", {
        type: "button",
        onClick: onRestart,
        className: "result-restart"
      }, "重新测试")
    ),
    h("div", { className: `result-toast ${toastMessage ? "result-toast-visible" : ""}`, role: "status", "aria-live": "polite" }, toastMessage)
  );
}

function FinalResultPage({
  calculatedResult,
  activePopup,
  onOpenPopup: _onOpenPopup,
  onClosePopup,
  onRestart
}: {
  calculatedResult: CalculatedResult;
  activePopup: PopupType | null;
  onOpenPopup: (type: PopupType) => void;
  onClosePopup: () => void;
  onRestart: () => void;
}) {
  const parts = getResultParts(calculatedResult);
  const personaImage = personaImages[calculatedResult.personaImageKey] || personaImages[parts.persona.id] || personaImages.STAR;
  const badges = parts.badges;
  const captureRef = React.useRef<HTMLElement | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toastMessage, shareResult } = useShareFeedback();

  const saveFullResult = async () => {
    if (!captureRef.current || isSaving) return;

    trackEvent("click_save_image", {
      personality_result: calculatedResult.personaImageKey,
      ...getSharedAnalyticsPayload()
    });
    setIsSaving(true);
    captureRef.current.classList.add("result-exporting");
    try {
      await document.fonts?.ready?.catch(() => undefined);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const exportChips: SvgExportChip[] = Array.from(captureRef.current.querySelectorAll<HTMLElement>(".result-chip")).map((chip) => {
        const rect = chip.getBoundingClientRect();
        const icon = chip.querySelector<HTMLElement>(".result-chip-icon")?.innerText.trim() || "";
        const text = Array.from(chip.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join("")
          .trim();
        return {
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
          icon,
          text,
          background: window.getComputedStyle(chip).backgroundImage !== "none"
            ? window.getComputedStyle(chip).backgroundImage
            : window.getComputedStyle(chip).backgroundColor
        };
      });
      const exportTitles: SvgExportTitle[] = Array.from(captureRef.current.querySelectorAll<HTMLElement>(".result-card-title")).map((title) => {
        const rect = title.getBoundingClientRect();
        const icon = title.querySelector<HTMLElement>(".result-card-title-icon")?.innerText.trim() || "";
        const text = Array.from(title.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join("")
          .trim();
        return {
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
          icon,
          text
        };
      });
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#ffffff",
        scale: Math.min(window.devicePixelRatio || 2, 3),
        useCORS: true,
        windowWidth: captureRef.current.scrollWidth,
        windowHeight: captureRef.current.scrollHeight,
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll<HTMLElement>(".result-chip").forEach((chip, index) => {
            const exportChip = exportChips[index];
            if (!exportChip) return;
            const image = clonedDocument.createElement("img");
            image.src = chipSvgDataUrl(exportChip);
            image.alt = chip.textContent?.trim() || "";
            image.style.display = "block";
            image.style.width = `${exportChip.width}px`;
            image.style.height = `${exportChip.height}px`;
            chip.replaceWith(image);
          });
          clonedDocument.querySelectorAll<HTMLElement>(".result-card-title").forEach((title, index) => {
            const exportTitle = exportTitles[index];
            if (!exportTitle) return;
            const image = clonedDocument.createElement("img");
            image.src = titleSvgDataUrl(exportTitle);
            image.alt = title.textContent?.trim() || "";
            image.style.display = "block";
            image.style.width = `${exportTitle.width}px`;
            image.style.height = `${exportTitle.height}px`;
            title.replaceWith(image);
          });
        }
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `REDI-${calculatedResult.personaImageKey}.png`;
      link.click();
    } finally {
      captureRef.current?.classList.remove("result-exporting");
      setIsSaving(false);
    }
  };

  return h("main", { className: "result-page result-page-redesign" },
    h("article", { ref: captureRef, className: "result-export-surface" },
      h("section", { className: "result-hero-panel" },
        h(PhoneStatus),
        h("h1", { className: "result-title" }, `${parts.persona.name} · ${parts.persona.englishName}`),
        h("figure", { className: "result-character-stage" },
          h("img", {
            src: resultBracketLeftImage,
            alt: "",
            className: "result-deco result-deco-left",
            "aria-hidden": "true"
          }),
          h("img", {
            src: personaImage,
            alt: `${parts.persona.name}人格形象`,
            className: "result-avatar"
          }),
          h("img", {
            src: resultBracketRightImage,
            alt: "",
            className: "result-deco result-deco-right",
            "aria-hidden": "true"
          })
        )
      ),
      h("section", { className: "result-content-flow" },
        h("blockquote", { className: "result-declaration" },
          h("p", null, `“${parts.persona.declaration}”`)
        ),
        h("div", { className: "result-chip-row", "aria-label": "人格标签" },
          parts.persona.tags.map((tag, index) => h("span", { key: tag, className: "result-chip" },
            h("span", { className: "result-chip-icon", "aria-hidden": "true" }, chipIcons[index % chipIcons.length]),
            tag
          ))
        ),
        h("section", { className: "result-profile", "aria-label": "人格档案" },
          parts.persona.body.map((paragraph) => h("p", { key: paragraph }, paragraph))
        ),
        h("div", { className: "result-flower-divider", "aria-hidden": "true" },
          h("img", { src: resultFlowerImage, alt: "" })
        ),
        h("section", { className: "result-card-section result-action-section", "aria-label": "经期行动小锦囊" },
          h("article", { className: "result-info-card result-action-card" },
            h("h2", { className: "result-card-title result-card-title-action" },
              h("span", { className: "result-card-title-icon", "aria-hidden": "true" }, "+"),
              "经期活动小锦囊"
            ),
            h("h3", null, parts.actionKit.name),
            parts.actionKit.body.map((paragraph) => h("p", { key: paragraph }, paragraph)),
            h("p", { className: "result-card-lead" }, "可以试着："),
            h("ul", { className: "result-card-list" },
              parts.actionKit.tips.map((tip) => h("li", { key: tip }, tip))
            ),
            h("p", { className: "result-card-closing" }, parts.actionKit.declaration)
          )
        ),
        badges.length > 0 && h("section", { className: "result-card-section result-medal-section", "aria-label": "特别勋章解读" },
          badges.map((badge) => h("article", { key: badge.id, className: "result-info-card result-medal-card" },
            h("h2", { className: "result-card-title result-card-title-medal" },
              h("span", { className: "result-card-title-icon", "aria-hidden": "true" }, "✦"),
              "特别勋章解读"
            ),
            h("h3", null, `${badge.name} · ${badge.englishName}`),
            "declaration" in badge && h("p", null, badge.declaration),
            badge.body.map((paragraph) => h("p", { key: paragraph }, paragraph))
          ))
        ),
        h("footer", { className: "result-actions" },
          h("button", {
            type: "button",
            onClick: saveFullResult,
            disabled: isSaving,
            className: "result-footer-button result-save-button"
          }, "一键长图保存"),
          h("button", {
            type: "button",
            onClick: shareResult,
            className: "result-footer-button result-footer-share"
          }, "复制链接分享")
        ),
        h("button", {
          type: "button",
          onClick: onRestart,
          className: "result-restart"
        }, "重新测试"),
        h(ResultDisclaimer)
      )
    ),
    h("div", { className: `result-toast ${toastMessage ? "result-toast-visible" : ""}`, role: "status", "aria-live": "polite" }, toastMessage),
    activePopup && h(ResultPopup, { type: activePopup, parts, calculatedResult, onClose: onClosePopup })
  );
}

function ResultDisclaimer() {
  return h("p", { className: "result-disclaimer mx-auto" }, resultDisclaimer);
}

function TiltCard({ className, label, onClick }: { className: string; label: string; onClick: () => void }) {
  return h("button", { type: "button", className, onClick }, h("span", null, label));
}

function getResultParts(calculatedResult: CalculatedResult): ResultParts {
  return {
    persona: mainResultById[calculatedResult.mainPersona.id as keyof typeof mainResultById],
    actionKit: actionKitById[calculatedResult.actionKit.id as keyof typeof actionKitById],
    badges: calculatedResult.badges.map((id) => badgeById[id]).filter(Boolean)
  };
}

function ResultPopup({
  type,
  parts,
  calculatedResult,
  onClose
}: {
  type: PopupType;
  parts: ResultParts;
  calculatedResult: CalculatedResult;
  onClose: () => void;
}) {
  if (type === "save") {
    return h(SaveImagePopup, { parts, calculatedResult, onClose });
  }

  const content = popupContentFor(type, parts, calculatedResult);

  return h("div", { className: "result-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "result-popup-title" },
    h("button", { type: "button", className: "result-modal-backdrop", "aria-label": "关闭弹窗", onClick: onClose }),
    h("div", { className: "result-popup-elements", "aria-hidden": "true" },
      h("span", { className: "popup-face" }),
      h("span", { className: "popup-bubble" }),
      h("span", { className: "popup-curl popup-curl-left" }, "{"),
      h("span", { className: "popup-curl popup-curl-right" }, "}"),
      h("span", { className: "popup-spark" }, "✦")
    ),
    h("article", { className: "result-popup-card" },
      h("button", { type: "button", className: "result-popup-close", "aria-label": "关闭弹窗", onClick: onClose }, "×"),
      content.kicker && h("p", { className: "text-xs font-bold tracking-[0.16em] text-black/50" }, content.kicker),
      h("h2", { id: "result-popup-title", className: "font-cn mt-2 text-[1.35rem] font-semibold text-black" }, content.title),
      h("div", { className: "mt-5 space-y-3 text-left text-[0.94rem] leading-7 text-black/78" },
        content.body.map((paragraph) => {
          const isBadgeTitle = type === "hidden" && parts.badges.some((badge) => paragraph.startsWith(`${badge.name} ·`));
          return h("p", { key: paragraph, className: isBadgeTitle ? "result-popup-badge-title" : undefined }, paragraph);
        })
      ),
      content.tips.length > 0 && h("ul", { className: "mt-5 space-y-2 text-left", "aria-label": "行动建议" },
        content.tips.map((tip) => h("li", { key: tip, className: "rounded-xl bg-white/58 px-4 py-3 text-sm leading-6 text-black/78" }, tip))
      ),
    )
  );
}

function SaveImagePopup({
  parts,
  calculatedResult,
  onClose
}: {
  parts: ResultParts;
  calculatedResult: CalculatedResult;
  onClose: () => void;
}) {
  const captureRef = React.useRef<HTMLElement | null>(null);
  const personaImage = personaImages[calculatedResult.personaImageKey] || personaImages[parts.persona.id] || personaImages.STAR;
  const badges = parts.badges;

  const saveImage = async () => {
    if (!captureRef.current) return;

    trackEvent("click_save_image", {
      personality_result: calculatedResult.personaImageKey,
      source: "save_popup",
      ...getSharedAnalyticsPayload()
    });
    const canvas = await html2canvas(captureRef.current, {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 2, 3),
      useCORS: true
    });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `REDI-${calculatedResult.personaImageKey}.png`;
    link.click();
  };

  return h("div", { className: "result-modal save-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "save-popup-title" },
    h("button", { type: "button", className: "result-modal-backdrop", "aria-label": "关闭弹窗", onClick: onClose }),
    h("div", { className: "save-popup-elements", "aria-hidden": "true" },
      h("span", { className: "popup-curl popup-curl-left" }, "{"),
      h("span", { className: "popup-curl popup-curl-right" }, "}")
    ),
    h("section", { className: "save-popup-shell" },
      h("button", { type: "button", className: "result-popup-close save-popup-close", "aria-label": "关闭弹窗", onClick: onClose }, "×"),
      h("div", { className: "save-popup-scroll" },
        h("article", { ref: captureRef, className: "save-long-card" },
          h("figure", { className: "save-avatar-wrap" },
            h("img", {
              src: personaImage,
              alt: `${parts.persona.name}人格形象`,
              className: "save-avatar"
            })
          ),
          h("div", { className: "save-chip-row" },
            parts.persona.tags.map((tag) => h("span", { key: tag, className: "result-chip" }, `≋ ${tag}`)),
            calculatedResult.badges.includes("HARD") && h("span", { className: "result-chip" }, "♿ DISABILITY")
          ),
          h("h1", { id: "save-popup-title", className: "save-quote" }, `“${parts.persona.declaration}”`),
          h("section", { className: "save-section save-section-persona" },
            h("h2", null, "人格档案"),
            parts.persona.body.map((paragraph) => h("p", { key: paragraph }, paragraph))
          ),
          h("section", { className: "save-section save-section-action" },
            h("h2", null, "经期行动小锦囊"),
            h("p", null, parts.actionKit.declaration),
            parts.actionKit.body.map((paragraph) => h("p", { key: paragraph }, paragraph)),
            h("ul", null, parts.actionKit.tips.map((tip) => h("li", { key: tip }, tip)))
          ),
          badges.length > 0 && h("section", { className: "save-section save-section-badges" },
            h("h2", null, "特别勋章解读"),
            badges.map((badge) => h("div", { key: badge.id, className: "save-badge-block" },
              h("h3", null, badge.name),
              h("p", null, badge.declaration),
              badge.body.map((paragraph) => h("p", { key: paragraph }, paragraph))
            ))
          ),
          h("footer", { className: "save-card-footer" }, "REDI 月经人格测试 · 你的完整结果长图")
        )
      ),
      h("button", { type: "button", className: "save-download-button", onClick: saveImage },
        h("span", { className: "download-icon", "aria-hidden": "true" },
          h("svg", { viewBox: "0 0 24 24", fill: "none" },
            h("path", { d: "M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" })
          )
        ),
        "保存到本地"
      )
    )
  );
}

function popupContentFor(type: PopupType, parts: ResultParts, calculatedResult: CalculatedResult) {
  if (type === "persona") {
    return {
      kicker: calculatedResult.personaImageKey,
      title: parts.persona.name,
      body: parts.persona.body,
      tips: [] as string[]
    };
  }

  if (type === "action") {
    return {
      kicker: parts.actionKit.id,
      title: parts.actionKit.name,
      body: parts.actionKit.body,
      tips: [...parts.actionKit.tips]
    };
  }

  if (type === "hidden") {
    return {
      kicker: "",
      title: "特别勋章解读",
      body: parts.badges.flatMap((badge) => [`${badge.name} · ${badge.englishName}`, ...badge.body]),
      tips: [] as string[]
    };
  }

  return {
    kicker: "LONG IMAGE",
    title: "长图保存",
    body: ["这里会生成你的完整结果长图：包含主人格、特别勋章、行动锦囊和分享文案。"],
    tips: [] as string[]
  };
}

const symbolLabels: Record<string, string> = {
  spark: "星光符号",
  drop: "水滴符号",
  radio: "信号符号",
  calendar: "日历符号",
  bell: "预警符号",
  quote: "引号符号",
  notebook: "笔记本符号",
  stone: "石缝符号",
  submarine: "潜行符号",
  cup: "杯子符号",
  megaphone: "发声符号"
};

const symbolPaths: Record<string, string> = {
  spark: "M48 18 L54 39 L75 45 L55 53 L48 76 L40 54 L20 48 L41 40 Z",
  drop: "M48 17 C61 33 70 47 70 60 C70 73 60 82 48 82 C36 82 26 73 26 60 C26 47 35 33 48 17 Z",
  radio: "M25 44 H71 V72 H25 Z M34 55 H45 M58 58 A7 7 0 1 0 58 57 M35 24 L61 39",
  calendar: "M25 27 H71 V74 H25 Z M25 41 H71 M36 21 V32 M60 21 V32 M38 53 H39 M55 53 H56 M38 64 H39 M55 64 H56",
  bell: "M31 63 H65 L60 55 V42 C60 33 55 27 48 27 C41 27 36 33 36 42 V55 Z M43 70 C45 74 51 74 53 70",
  quote: "M35 34 C29 39 27 46 29 57 H40 C41 47 39 40 35 34 Z M58 34 C52 39 50 46 52 57 H63 C64 47 62 40 58 34 Z",
  notebook: "M31 21 H67 V75 H31 Z M25 31 H37 M25 43 H37 M25 55 H37 M25 67 H37 M43 34 H59 M43 47 H59",
  stone: "M28 61 L35 34 L53 23 L71 40 L65 65 L45 76 Z",
  submarine: "M23 55 C31 40 65 40 73 55 C65 69 31 69 23 55 Z M38 43 V31 H52 M45 31 V22 M37 56 H38 M48 56 H49 M59 56 H60",
  cup: "M30 27 H61 L57 70 H34 Z M61 38 H72 C72 52 65 58 58 58",
  megaphone: "M22 53 H36 L66 36 V70 L36 57 H22 Z M36 57 L41 73 M72 45 L80 38 M74 55 H84 M72 65 L80 72"
};

function Symbol({ type = "spark", className = "" }: { type?: string; className?: string }) {
  return h("svg", {
    className,
    role: "img",
    "aria-label": symbolLabels[type] || "装饰符号",
    viewBox: "0 0 96 96",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  },
    h("circle", { cx: "48", cy: "48", r: "44", fill: "currentColor", opacity: "0.12" }),
    h("path", {
      d: symbolPaths[type] || symbolPaths.spark,
      stroke: "currentColor",
      strokeWidth: "5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(h(App));
