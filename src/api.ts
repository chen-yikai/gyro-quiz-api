import { Elysia, t } from "elysia";
import questions from "./questions";
import history from "./history";
import oauth from "./oauth";

const api = new Elysia({ prefix: "/api" })
  .use(questions)
  .use(history)
  .use(oauth);

export default api;
