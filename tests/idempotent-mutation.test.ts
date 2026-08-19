/**
 * Server-side idempotency wrapper: a re-delivered mutation (same
 * idempotencyKey) must return the recorded result without running the
 * handler — i.e. the same queued create retried cannot produce a duplicate
 * server record.
 */

jest.mock("../convex/_generated/server", () => ({
  // Pass-through: expose the wrapped definition so tests can call handler.
  mutation: (def: any) => def,
}));

import { idempotentMutation } from "../convex/idempotency";
import { v } from "convex/values";

const USER = { _id: "user_1", tokenIdentifier: "tok" };

function makeCtx() {
  const log: any[] = [];
  const ctx = {
    db: {
      query: (table: string) => ({
        withIndex: (_name: string, _cb: any) => ({
          first: async () => {
            if (table === "users") return USER;
            if (table === "mutationLog") {
              // The index callback narrows by (userId, key); emulate by
              // matching against the last-queried key via closure state.
              return log.find((row) => row.key === ctx.__lastKey) ?? null;
            }
            return null;
          },
        }),
      }),
      insert: async (table: string, doc: any) => {
        if (table === "mutationLog") log.push(doc);
        return `${table}_id`;
      },
    },
    __lastKey: undefined as string | undefined,
    __log: log,
  };
  return ctx;
}

describe("idempotentMutation", () => {
  const handler = jest.fn(async () => "created_doc_id");
  const wrapped = idempotentMutation({
    args: { token: v.string(), amount: v.number() },
    handler,
  }) as any;

  beforeEach(() => handler.mockClear());

  it("runs the handler and records the result on first delivery", async () => {
    const ctx = makeCtx();
    ctx.__lastKey = "key-1";
    const result = await wrapped.handler(ctx, {
      token: "tok",
      amount: 5,
      idempotencyKey: "key-1",
    });

    expect(result).toBe("created_doc_id");
    expect(handler).toHaveBeenCalledTimes(1);
    // The key is stripped before the handler sees the args.
    expect(handler.mock.calls[0][1]).toEqual({ token: "tok", amount: 5 });
    expect(ctx.__log).toEqual([
      expect.objectContaining({ key: "key-1", result: "created_doc_id" }),
    ]);
  });

  it("replays the recorded result without re-running the handler", async () => {
    const ctx = makeCtx();
    ctx.__lastKey = "key-1";
    await wrapped.handler(ctx, { token: "tok", amount: 5, idempotencyKey: "key-1" });
    handler.mockClear();

    const replay = await wrapped.handler(ctx, {
      token: "tok",
      amount: 5,
      idempotencyKey: "key-1",
    });

    expect(replay).toBe("created_doc_id");
    expect(handler).not.toHaveBeenCalled(); // no duplicate write
    expect(ctx.__log).toHaveLength(1);
  });

  it("runs the handler normally when no key is supplied", async () => {
    const ctx = makeCtx();
    const result = await wrapped.handler(ctx, { token: "tok", amount: 5 });
    expect(result).toBe("created_doc_id");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(ctx.__log).toHaveLength(0);
  });
});
