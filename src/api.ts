import { Elysia, t } from "elysia";
import questions from "./questions";
import history from "./history";
import auth from "./auth";

const api = new Elysia({ prefix: "/api" })
  .onError(({ code, set }) => {
    switch (code) {
      case "VALIDATION":
        set.status = 400;
        return { message: "資料格式錯誤" };
      case "PARSE":
        set.status = 400;
        return { message: "請求內容格式錯誤" };
      case "NOT_FOUND":
        set.status = 404;
        return { message: "找不到請求的資源" };
      case "INTERNAL_SERVER_ERROR":
        set.status = 500;
        return { message: "伺服器發生內部錯誤" };
      default:
        set.status = 500;
        return { message: "發生未知錯誤" };
    }
  })
  .use(questions)
  .use(history)
  .use(auth);

export default api;
