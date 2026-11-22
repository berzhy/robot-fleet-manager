import { pageMetadata } from "@/ui/features/robots/test-robots";
import { afterEach, expect, test, vi } from "vitest";
import {
  ApiError,
  createRobots,
  deleteAllRobots,
  getRobots,
  getRobotContext,
  deleteRobot as dataDeleteRobot,
  isRobotNotFound,
  sendRobotAction,
} from "./robot-api";

afterEach(() => vi.unstubAllGlobals());

test("requests a server page with cancellation and rejects HTTP failures", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        items: [],
        total: 0,
        page: 2,
        pageSize: 20,
        ...pageMetadata(),
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);

  const controller = new AbortController();
  expect(
    await getRobots(
      { page: 2, pageSize: 20, filters: { view: "all" } },
      controller.signal,
    ),
  ).toEqual({
    items: [],
    total: 0,
    page: 2,
    pageSize: 20,
    ...pageMetadata(),
    evaluatedAt: expect.any(Number) as number,
  });
  expect(fetcher).toHaveBeenCalledWith("/api/robots?page=2&pageSize=20", {
    signal: expect.any(AbortSignal) as AbortSignal,
    cache: "no-store",
  });

  await expect(
    getRobots({ page: 0, pageSize: 10, filters: { view: "all" } }),
  ).rejects.toThrow("Unable to load robots.");
});

test("deletes an encoded robot id and distinguishes an already removed robot from a failed request", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(
      Response.json(
        { error: { message: "Robot not found." } },
        { status: 404 },
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);

  await expect(dataDeleteRobot("robot/id")).resolves.toBe("deleted");
  expect(fetcher).toHaveBeenCalledWith("/api/robots/robot%2Fid", {
    method: "DELETE",
    signal: expect.any(AbortSignal) as AbortSignal,
  });

  await expect(dataDeleteRobot("missing")).resolves.toBe("already-removed");
  await expect(dataDeleteRobot("failure")).rejects.toThrow(
    "Unable to delete robot.",
  );
});

test("a failed response carries its status and the server's message", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "Robot isn't connected" } },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        new Response("<html>Bad gateway</html>", { status: 502 }),
      ),
  );

  await expect(sendRobotAction("robot", "stop")).rejects.toEqual(
    new ApiError(409, "Robot isn't connected"),
  );
  await expect(sendRobotAction("robot", "stop")).rejects.toMatchObject({
    status: 502,
    message: "Unable to request robot action.",
  });
});

test("creates robots in one batch POST and requires a 201 response", async () => {
  const input = {
    name: "Robot ABCD1234",
    manufacturer: "Maker",
    type: "inspection" as const,
    integrationType: "vendor-api" as const,
    site: "Munich",
  };
  const created = {
    ...input,
    id: "new",
    createdAt: "2026-11-14T12:00:00.000Z",
    activity: null,
    area: null,
    batteryPercent: null,
    lastReceivedAt: null,
    connection: null,
    batteryLevel: null,
    blockedActions: {},
    queuedActions: [],
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: [created] }, { status: 201 }))
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);

  expect(await createRobots([input])).toEqual([created]);
  expect(fetcher).toHaveBeenCalledWith("/api/robots/batch", {
    method: "POST",
    signal: expect.any(AbortSignal) as AbortSignal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ robots: [input] }),
  });

  await expect(createRobots([input])).rejects.toThrow("Unable to add robots.");
});

test("detail requests encode IDs, support cancellation, and distinguish deletion from failure", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { error: { message: "Robot not found." } },
        { status: 404 },
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);

  const controller = new AbortController();
  const deleted = await getRobotContext("robot/id", controller.signal).catch(
    (error: unknown) => error,
  );
  expect(isRobotNotFound(deleted)).toBe(true);
  expect(fetcher).toHaveBeenCalledWith("/api/robots/robot%2Fid/context", {
    cache: "no-store",
    signal: expect.any(AbortSignal) as AbortSignal,
  });

  const failure = await getRobotContext("failure").catch(
    (error: unknown) => error,
  );
  expect(isRobotNotFound(failure)).toBe(false);
  expect(failure).toMatchObject({
    message: "Unable to refresh robot context.",
  });
});

test("encodes literal search text and combined filters in the list request", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      items: [],
      total: 0,
      page: 0,
      pageSize: 20,
      ...pageMetadata(),
    }),
  );
  vi.stubGlobal("fetch", fetcher);

  await getRobots({
    page: 0,
    pageSize: 20,
    filters: {
      view: "offline",
      search: "Robot %_&",
      site: "Munich & Berlin",
      manufacturer: "A/B",
      integrationType: "ros2",
      type: "inspection",
    },
  });
  const url = new URL(fetcher.mock.calls[0][0] as string, "http://localhost");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    page: "0",
    pageSize: "20",
    view: "offline",
    search: "Robot %_&",
    site: "Munich & Berlin",
    manufacturer: "A/B",
    integrationType: "ros2",
    type: "inspection",
  });
});

test("caller cancellation aborts the combined read signal", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [] }));
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  await getRobots(
    { page: 0, pageSize: 10, filters: { view: "all" } },
    controller.signal,
  );
  const signal = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
    .signal!;
  expect(signal.aborted).toBe(false);
  controller.abort();
  expect(signal.aborted).toBe(true);
});

test.each(["batch", "delete", "bulk-delete"])(
  "%s requests terminate on their deadline without retrying",
  async (operation) => {
    const timeout = new AbortController();
    const deadline = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeout.signal);
    const fetcher = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal!.addEventListener(
            "abort",
            () => {
              const reason: unknown = options.signal!.reason;
              reject(
                reason instanceof Error || reason instanceof DOMException
                  ? reason
                  : new Error("Request aborted"),
              );
            },
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const input = {
      name: "Test",
      manufacturer: "Maker",
      type: "inspection" as const,
      integrationType: "vendor-api" as const,
      site: "Munich",
    };
    const request =
      operation === "batch"
        ? createRobots([input])
        : operation === "delete"
          ? dataDeleteRobot("one")
          : deleteAllRobots();
    const failure = expect(request).rejects.toMatchObject({
      name: "TimeoutError",
    });
    timeout.abort(new DOMException("Timed out", "TimeoutError"));
    await failure;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(deadline).toHaveBeenCalledWith(5000);
    vi.restoreAllMocks();
  },
);
