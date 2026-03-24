import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import type { HistoryEntry, HistoryJson, JwtPayload } from "../data/type";
import { JWT_SECRET } from "./auth";

const HISTORY_PATH = "./data/history.json";

const readHistoryJson = async (): Promise<HistoryJson> => {
  try {
    const file = Bun.file(HISTORY_PATH);
    if (!(await file.exists())) {
      return { data: [] };
    }
    const content = await file.text();
    return JSON.parse(content) as HistoryJson;
  } catch {
    return { data: [] };
  }
};

const writeHistoryJson = async (data: HistoryJson): Promise<void> => {
  await Bun.write(HISTORY_PATH, JSON.stringify(data, null, 2));
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const history = new Elysia({
  prefix: "/history",
  tags: ["作答紀錄"],
})
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )
  .derive(async ({ jwt, headers, set }) => {
    const auth = headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      set.status = 401;
      return { user: null };
    }

    const token = auth.slice(7);
    const payload = await jwt.verify(token) as JwtPayload | false;

    if (!payload) {
      set.status = 401;
      return { user: null };
    }

    return { user: payload };
  })
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { message: "未提供有效的存取授權" };
    }
  })
  .get(
    "/",
    async ({ user, query }) => {
      const parsed = await readHistoryJson();
      // Only return current user's history
      const userHistory = parsed.data.filter((entry) => entry.userId === user!.userId);
      
      // Sort by createdAt descending (newest first)
      userHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const total = userHistory.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      
      return {
        data: userHistory.slice(start, end),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1, description: "頁碼，從 1 開始" })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 10, description: "每頁筆數，最多 100" })),
      }),
      detail: {
        summary: "取得作答紀錄列表",
        description: "取得當前使用者的所有作答紀錄，支援分頁。需要 Bearer Token 驗證。",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .post(
    "/",
    async ({ body, set, user }) => {
      const parsed = await readHistoryJson();

      const newEntry: HistoryEntry = {
        id: generateId(),
        userId: user!.userId,
        difficulty: body.difficulty,
        score: body.score,
        questions: body.questions,
        createdAt: new Date().toISOString(),
      };

      parsed.data.push(newEntry);
      await writeHistoryJson(parsed);

      set.status = 201;
      return newEntry;
    },
    {
      body: t.Object({
        difficulty: t.Union([
          t.Literal("easy"),
          t.Literal("medium"),
          t.Literal("hard"),
        ]),
        score: t.Number(),
        questions: t.Array(
          t.Object({
            questionId: t.Number(),
            options: t.Array(
              t.Object({
                optionId: t.Number(),
                attempts: t.Number({ minimum: 0 }),
              })
            ),
          })
        ),
      }),
      detail: {
        summary: "建立作答紀錄",
        description:
          "新增一筆遊戲作答紀錄。使用者 ID 會自動從 Token 取得。需要 Bearer Token 驗證。",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .get(
    "/:id",
    async ({ params, set, user }) => {
      const parsed = await readHistoryJson();
      const entry = parsed.data.find((item) => item.id === params.id);

      if (!entry) {
        set.status = 404;
        return { message: `找不到 ID 為 '${params.id}' 的作答紀錄` };
      }

      // Only allow access to own records
      if (entry.userId !== user!.userId) {
        set.status = 403;
        return { message: "無權存取此紀錄" };
      }

      return entry;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "取得單筆作答紀錄",
        description: "依據 ID 取得特定遊戲的作答紀錄。需要 Bearer Token 驗證。",
        security: [{ bearerAuth: [] }],
      },
    }
  );

export default history;
