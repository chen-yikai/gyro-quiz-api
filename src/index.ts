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
          { name: "頁面", description: "OAuth 登入頁面" },
          { name: "題目", description: "題目管理相關 API" },
          { name: "作答紀錄", description: "作答紀錄管理相關 API" },
          { name: "使用者驗證", description: "使用者 OAuth 相關 API" },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description:
                "使用 /api/oauth/login 或 /api/oauth/register 取得的 JWT Token",
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
      detail: {
        tags: ["頁面"],
        summary: "OAuth 登入頁面",
        description:
          "開啟登入/註冊頁面。登入成功後會將 token、userId、email 透過 redirect_uri 回傳給行動應用程式。回傳格式: `{redirect_uri}?token={token}&userId={userId}&email={email}`。範例: `gyroquiz://auth?token=eyJhbG...&userId=abc123&email=user@example.com`",
      },
    },
  )
  .use(api)
  .use(staticRoute)
  .listen(port);

console.log(`Server is running on http://localhost:${port}`);
