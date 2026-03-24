import { Elysia, t } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import api from "./api";
import openapi from "@elysiajs/openapi";
import cors from "@elysiajs/cors";

const port = process.env.PORT || 3000;

const staticRoute = new Elysia({ detail: { hide: true } }).use(
  staticPlugin({ assets: "public", prefix: "/" }),
);

new Elysia()
  .onRequest(({ request }) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${request.method} ${request.url}`);
  })
  .use(cors())
  .use(
    openapi({
      path: "/docs",
      documentation: {
        info: {
          title: "Gyro Quiz API",
          version: "1.0.0",
          description:
            "知識競賽應用程式 API，提供題目管理及作答紀錄功能。\n\n作答紀錄 API 需要在 Header 加入 `Authorization: Bearer <token>`",
        },
        tags: [
          { name: "頁面", description: "登入頁面" },
          { name: "題目", description: "題目管理相關 API" },
          { name: "作答紀錄", description: "作答紀錄管理相關 API" },
          { name: "使用者驗證 (標準)", description: "標準 signIn / signUp 驗證 API" },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description:
                "使用 /api/auth/signIn 或 /api/auth/signUp 取得的 JWT Token",
            },
          },
        },
      },
      scalar: {
        defaultOpenAllTags: true,
      },
    }),
  )
  .get(
    "/",
    ({ redirect, query }) => {
      const redirectUri = query.redirect_uri || "";
      return redirect(
        `/index.html${
          redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ""
        }`,
      );
    },
    {
      query: t.Object({
        redirect_uri: t.Optional(
          t.String({
            default: "gyroquiz://auth",
            description: "登入成功後的跳轉網址，用於行動應用程式 Deep Link",
          }),
        ),
      }),
      detail: { hide: true },
    },
  )
  .use(api)
  .use(staticRoute)
  .listen(port);

console.log(`Server is running on http://localhost:${port}`);
