import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import api from "./api";

const app = new Elysia().use(api);

describe("Questions API", () => {
  it("GET /api/questions - should return questions list", async () => {
    const res = await app.handle(new Request("http://localhost/api/questions"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/questions?limit=5 - should limit results", async () => {
    const res = await app.handle(new Request("http://localhost/api/questions?limit=5"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(5);
  });

  it("GET /api/questions?filter=easy - should filter by difficulty", async () => {
    const res = await app.handle(new Request("http://localhost/api/questions?filter=easy"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    data.forEach((q: any) => expect(q.difficulty).toBe("easy"));
  });

  it("GET /api/questions/info - should return questions info", async () => {
    const res = await app.handle(new Request("http://localhost/api/questions/info"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("version");
  });

  it("GET /api/questions/scores - should return score settings", async () => {
    const res = await app.handle(new Request("http://localhost/api/questions/scores"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("easy");
    expect(data).toHaveProperty("medium");
    expect(data).toHaveProperty("hard");
  });

  it("GET /api/questions/generate - should generate random questions", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/questions/generate?quantity=3&difficulty=easy")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(3);
  });

  it("GET /api/questions/generate - should support multiple difficulties", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/questions/generate?quantity=5&difficulty=easy&difficulty=medium")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(5);
    data.forEach((q: any) =>
      expect(["easy", "medium"]).toContain(q.difficulty)
    );
  });

  it("GET /api/questions/:id - should return single question", async () => {
    // First get a valid question ID
    const listRes = await app.handle(new Request("http://localhost/api/questions?limit=1"));
    const questions = await listRes.json();
    const validId = questions[0].id;

    const res = await app.handle(new Request(`http://localhost/api/questions/${validId}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("content");
  });

  it("GET /api/questions/:id - should return 404 for invalid id", async () => {
    const res = await app.handle(new Request("http://localhost/api/questions/99999"));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty("message");
  });
});

describe("Auth API", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "testpassword123";
  let authToken: string;
  let userId: string;

  it("POST /api/auth/signUp - should register new user", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty("token");
    expect(data).toHaveProperty("userId");
    expect(data.email).toBe(testEmail);
    authToken = data.token;
    userId = data.userId;
  });

  it("POST /api/auth/signUp - should reject duplicate email", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("message");
  });

  it("POST /api/auth/signIn - should login successfully", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signIn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("token");
    expect(data.email).toBe(testEmail);
    authToken = data.token;
  });

  it("POST /api/auth/signIn - should reject wrong password", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signIn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: "wrongpassword" }),
      })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("message");
  });

  it("GET /api/auth/:userId - should return user info", async () => {
    const res = await app.handle(new Request(`http://localhost/api/auth/${userId}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe(testEmail);
    expect(data.userId).toBe(userId);
  });
});

describe("History API", () => {
  const testEmail = `history-test-${Date.now()}@example.com`;
  const testPassword = "testpassword123";
  let authToken: string;

  beforeAll(async () => {
    // Register and get token
    const res = await app.handle(
      new Request("http://localhost/api/auth/signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    const data = await res.json();
    authToken = data.token;
  });

  it("GET /api/history - should reject without auth", async () => {
    const res = await app.handle(new Request("http://localhost/api/history"));
    expect(res.status).toBe(401);
  });

  it("GET /api/history - should return paginated history", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/history", {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("pagination");
    expect(data.pagination).toHaveProperty("page");
    expect(data.pagination).toHaveProperty("limit");
    expect(data.pagination).toHaveProperty("total");
    expect(data.pagination).toHaveProperty("totalPages");
  });

  it("POST /api/history - should create history entry", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          difficulty: "easy",
          score: 100,
          questions: [
            {
              questionId: 1,
              options: [{ optionId: 1, attempts: 1 }],
            },
          ],
        }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.difficulty).toBe("easy");
    expect(data.score).toBe(100);
  });

  it("GET /api/history?page=1&limit=5 - should paginate correctly", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/history?page=1&limit=5", {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(5);
  });
});

describe("Validation Errors", () => {
  it("should return uniform error format for validation errors", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email", password: "123" }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("資料格式錯誤");
  });

  it("should return error for invalid query params", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/questions?filter=invalid")
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("資料格式錯誤");
  });
});

describe("Error Handling", () => {
  it("should return 400 for malformed JSON body", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("message");
  });

  it("should return 404 for unknown route", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/unknown-route")
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty("message");
  });
});
