import { Elysia, t } from "elysia";
import questions from "./questions";
import history from "./history";
import oauth from "./oauth";

const api = new Elysia({ prefix: "/api" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        message: error.message,
      };
    }
  })
  .use(questions)
  .use(history)
  .use(oauth);

export default api;
