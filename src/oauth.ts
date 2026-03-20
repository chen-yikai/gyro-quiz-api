import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import type { OAuthUser, OAuthJson } from "../data/type";

const OAUTH_PATH = "./data/oauth.json";
const JWT_SECRET = process.env.JWT_SECRET || "gyro-quiz-secret-key-change-in-production";

const readOAuthJson = async (): Promise<OAuthJson> => {
  try {
    const file = Bun.file(OAUTH_PATH);
    if (!(await file.exists())) {
      return { data: [] };
    }
    const content = await file.text();
    return JSON.parse(content) as OAuthJson;
  } catch {
    return { data: [] };
  }
};

const writeOAuthJson = async (data: OAuthJson): Promise<void> => {
  await Bun.write(OAUTH_PATH, JSON.stringify(data, null, 2));
};

const generateUserId = (): string => {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const oauth = new Elysia({
  prefix: "/oauth",
  tags: ["使用者驗證"],
})
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )
  .post(
    "/register",
    async ({ body, set, jwt }) => {
      const parsed = await readOAuthJson();

      const existingUser = parsed.data.find((user) => user.email === body.email);
      if (existingUser) {
        set.status = 400;
        return { message: "此電子郵件已被註冊" };
      }

      const passwordHash = await hashPassword(body.password);

      const newUser: OAuthUser = {
        userId: generateUserId(),
        email: body.email,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      parsed.data.push(newUser);
      await writeOAuthJson(parsed);

      const token = await jwt.sign({
        userId: newUser.userId,
        email: newUser.email,
      });

      set.status = 201;
      return {
        userId: newUser.userId,
        email: newUser.email,
        token,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        summary: "使用者註冊",
        description: "使用電子郵件和密碼註冊新帳號，返回 JWT Token。",
      },
    }
  )
  .post(
    "/login",
    async ({ body, set, jwt }) => {
      const parsed = await readOAuthJson();

      const user = parsed.data.find((u) => u.email === body.email);
      if (!user) {
        set.status = 401;
        return { message: "電子郵件或密碼錯誤" };
      }

      const passwordHash = await hashPassword(body.password);
      if (user.passwordHash !== passwordHash) {
        set.status = 401;
        return { message: "電子郵件或密碼錯誤" };
      }

      const token = await jwt.sign({
        userId: user.userId,
        email: user.email,
      });

      return {
        userId: user.userId,
        email: user.email,
        token,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        summary: "使用者登入",
        description: "使用電子郵件和密碼登入，返回 JWT Token。",
      },
    }
  )
  .get(
    "/:userId",
    async ({ params, set }) => {
      const parsed = await readOAuthJson();
      const user = parsed.data.find((item) => item.userId === params.userId);

      if (!user) {
        set.status = 404;
        return { message: `找不到使用者 ID 為 '${params.userId}' 的使用者` };
      }

      return {
        userId: user.userId,
        email: user.email,
        createdAt: user.createdAt,
      };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      detail: {
        summary: "取得單一使用者資訊",
        description: "依據使用者 ID 取得特定使用者的詳細資訊。",
      },
    }
  );

export { JWT_SECRET };
export default oauth;
