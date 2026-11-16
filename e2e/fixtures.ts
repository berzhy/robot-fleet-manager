import { expect, test as base } from "@playwright/test";

export const test = base.extend<{ emptyFleet: void }>({
  emptyFleet: [
    async ({ request }, use) => {
      const response = await request.delete("/api/robots");
      expect(response.status()).toBe(204);
      await use();
    },
    { auto: true },
  ],
});
