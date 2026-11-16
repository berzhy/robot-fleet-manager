import { expect, test } from "@playwright/test";
import type { Robot } from "@/modules/robots/robot";

for (const [code, label] of [
  ["path-blocked", "Path blocked"],
  ["position-lost", "Position lost"],
  ["sensor-obstructed", "Sensor obstructed"],
] as const) {
  test(`${label} appears in table and details and Retry recovers it`, async ({
    page,
    request,
  }) => {
    const created = await request.post("/api/robots", {
      data: {
        name: `Problem demo ${code}`,
        site: "Munich",
        manufacturer: "Maker",
        type: "inspection",
        integrationType: "ros2",
      },
    });
    expect(created.status()).toBe(201);
    const robot = (await created.json()) as Robot;
    try {
      const report = async (recovered: boolean) => {
        const response = await request.post("/api/telemetry/batch", {
          data: {
            reports: [
              {
                robotId: robot.id,
                activity: recovered ? "working" : "needs-attention",
                problemCode: recovered ? null : code,
                batteryPercent: 61,
                area: "Lobby",
                observedAt: new Date().toISOString(),
                appliedControlRevision: recovered ? 1 : 0,
              },
            ],
          },
        });
        expect(response.status()).toBe(204);
      };
      await report(false);
      await page.goto("/");
      const row = page.getByTestId(`robot-row-${robot.id}`);
      await expect(row).toContainText(label);
      await row.getByRole("link", { name: robot.name, exact: true }).click();
      await expect(
        page.getByTestId("robot-details").getByRole("alert"),
      ).toContainText(label);
      const retry = page.getByRole("button", {
        name: "Retry activity",
        exact: true,
      });
      await expect(retry).toHaveAttribute("aria-disabled", "false");
      await retry.click();
      await expect(page.getByRole("status")).toContainText(
        "Retry activity requested.",
      );
      await report(true);
      await expect(
        page.getByTestId("robot-details").getByTestId("robot-activity"),
      ).toHaveText("Working", {
        timeout: 15000,
      });
      await expect(
        page.getByTestId("robot-details").getByRole("alert"),
      ).toHaveCount(0);
    } finally {
      await request.delete(`/api/robots/${robot.id}`);
    }
  });
}
