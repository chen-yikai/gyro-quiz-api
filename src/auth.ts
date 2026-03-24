import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import type { AuthUser, AuthJson } from "../data/type";

const JWT_SECRET = process.env.JWT_SECRET || "gyro-quiz-secret-key-change-in-production";

const AUTH_PATH = "./data/auth.json";

const readAuthJson = async (): Promise<AuthJson> => {
  try {
    const file = Bun.file(AUTH_PATH);
    if (!(await file.exists())) {
      return { data: [] };
    }
    const content = await file.text();
    return JSON.parse(content) as AuthJson;
  } catch {
    return { data: [] };
  }
};

const writeAuthJson = async (data: AuthJson): Promise<void> => {
  await Bun.write(AUTH_PATH, JSON.stringify(data, null, 2));
};

const generateUserId = (): string => {
  return `user-${crypto.randomUUID()}`;
};

const auth = new Elysia({
  prefix: "/auth",
  tags: ["使用者驗證 (標準)"],
})
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )
  .post(
    "/signUp",
    async ({ body, set, jwt }) => {
      const parsed = await readAuthJson();

      const existingUser = parsed.data.find((user) => user.email === body.email);
      if (existingUser) {
        set.status = 400;
        return { message: "此電子郵件已被註冊" };
      }

      const passwordHash = await Bun.password.hash(body.password);

      const newUser: AuthUser = {
        userId: generateUserId(),
        email: body.email,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      parsed.data.push(newUser);
      await writeAuthJson(parsed);

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
    "/signIn",
    async ({ body, set, jwt }) => {
      const parsed = await readAuthJson();

      const user = parsed.data.find((u) => u.email === body.email);
      if (!user) {
        set.status = 401;
        return { message: "電子郵件或密碼錯誤" };
      }

      const passwordMatch = await Bun.password.verify(body.password, user.passwordHash);
      if (!passwordMatch) {
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
      const parsed = await readAuthJson();
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
export default auth;
