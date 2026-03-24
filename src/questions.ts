import { Elysia, t } from "elysia";
import type { Difficulty, Question, QuestionsJson } from "../data/type";

const QUESTIONS_PATH = "./data/questions.json";
type QuestionOrderBy = "id" | "content" | "difficulty";
type SortDirection = "asc" | "desc";

const readQuestionsJson = async (): Promise<QuestionsJson> => {
  const content = await Bun.file(QUESTIONS_PATH).text();
  return JSON.parse(content) as QuestionsJson;
};

const pickRandomQuestions = (
  pool: Question[],
  quantity: number
): Question[] => {
  const shuffled = [...pool];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, quantity);
};

const difficultyRank: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const tDifficulty = t.Union([
  t.Literal("easy"),
  t.Literal("medium"),
  t.Literal("hard"),
]);

const questions = new Elysia({
  prefix: "/questions",
  tags: ["題目"],
})
  .get(
    "/",
    async ({ query }) => {
      const parsed = await readQuestionsJson();

      const filter = query.filter as Difficulty | undefined;
      const orderBy = (query.orderBy ??
        query.orderby ??
        "id") as QuestionOrderBy;
      const sort = (query.sort ?? "asc") as SortDirection;

      const filtered = filter
        ? parsed.data.filter((question) => question.difficulty === filter)
        : parsed.data;

      const sorted = [...filtered].sort((a, b) => {
        let comparison = 0;

        if (orderBy === "id") {
          comparison = a.id - b.id;
        } else if (orderBy === "difficulty") {
          comparison =
            difficultyRank[a.difficulty] - difficultyRank[b.difficulty];
        } else {
          comparison = a.content.localeCompare(b.content, "zh-Hant");
        }

        return sort === "asc" ? comparison : -comparison;
      });

      const limit = query.limit;
      if (limit) {
        return sorted.slice(0, limit);
      }

      return sorted;
    },
    {
      query: t.Object({
        filter: t.Optional(tDifficulty),
        orderBy: t.Optional(
          t.Union([
            t.Literal("id"),
            t.Literal("content"),
            t.Literal("difficulty"),
          ])
        ),
        orderby: t.Optional(
          t.Union([
            t.Literal("id"),
            t.Literal("content"),
            t.Literal("difficulty"),
          ])
        ),
        sort: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        limit: t.Optional(t.Numeric({ minimum: 1, description: "限制返回的題目數量" })),
      }),
      detail: {
        summary: "取得題目列表",
        description:
          "取得所有題目，支援依難度篩選、排序功能。可依 ID、內容或難度進行排序，並可透過 limit 限制返回數量。",
      },
    }
  )
  .get(
    "/generate",
    async ({ query, set }) => {
      const parsed = await readQuestionsJson();
      const rawDifficulty = query.difficulty;
      const difficulties = (
        Array.isArray(rawDifficulty) ? rawDifficulty : [rawDifficulty]
      ) as Difficulty[];
      const filtered = parsed.data.filter((question) =>
        difficulties.includes(question.difficulty)
      );

      if (filtered.length === 0) {
        set.status = 404;
        return {
          message: `找不到難度為 '${difficulties.join(", ")}' 的題目`,
        };
      }

      const quantity = Math.min(query.quantity, filtered.length);

      return pickRandomQuestions(filtered, quantity);
    },
    {
      query: t.Object({
        quantity: t.Numeric({ minimum: 1 }),
        difficulty: t.Union([tDifficulty, t.Array(tDifficulty)]),
      }),
      detail: {
        summary: "隨機產生題目",
        description:
          "依據指定的難度和數量，隨機產生一組題目。難度可指定單一值或多個值（重複 difficulty 參數）。若可用題目數量不足，將返回實際可用的數量。",
      },
    }
  )
  .get(
    "/info",
    async () => {
      const parsed = await readQuestionsJson();
      return parsed.info;
    },
    {
      detail: {
        summary: "取得題庫資訊",
        description: "取得題庫的基本資訊，包含名稱、版本、作者及總題數。",
      },
    }
  )
  .get(
    "/scores",
    async () => {
      const parsed = await readQuestionsJson();
      return parsed.score;
    },
    {
      detail: {
        summary: "取得計分設定",
        description: "取得各難度的得分及罰分設定。",
      },
    }
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const parsed = await readQuestionsJson();
      const question = parsed.data.find((q) => q.id === Number(params.id));

      if (!question) {
        set.status = 404;
        return {
          message: `找不到 ID 為 '${params.id}' 的題目`,
        };
      }

      return question;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "取得單一題目",
        description: "依據 ID 取得特定題目的詳細資訊。",
      },
    }
  );

export default questions;
