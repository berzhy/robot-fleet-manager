import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { Robot } from "@/modules/robots/robot";

import LocationMap from "./location-map";

const robot: Robot = {
  problemCode: null,
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Munich",
  area: null,
  activity: "charging",
  batteryPercent: null,
  lastTelemetryAt: null,
  lastReceivedAt: null,
  createdAt: "2026-11-14T12:00:00.000Z",
};

test("map limits peer markers without losing counts and separates unknown areas", () => {
  const peers = Array.from({ length: 17 }, (_, index) => ({
    id: `peer-${index}`,
    name: `Peer ${index}`,
    area: "Lobby",
    lastReceivedAt: null,
  }));
  render(
    <LocationMap
      robot={{ ...robot, area: "Lobby" }}
      peers={[...peers, { ...peers[0], id: "unknown", area: "Unmapped" }]}
      evaluatedAt={Date.now()}
      unverified={false}
    />,
  );
  expect(screen.getByRole("region", { name: "Location" })).toHaveTextContent(
    "Lobby: 17 other robots",
  );
  expect(screen.getByRole("region", { name: "Location" })).toHaveTextContent(
    "Area unknown: 1 other robot",
  );
  expect(screen.getByText("+5")).toBeInTheDocument();
  expect(screen.getByText(/Reported area: Lobby/)).toBeInTheDocument();
});

test.each([
  ["Munich", "Offices & warehouse", "3"],
  ["Berlin", "Office & service campus", "4"],
  ["Hamburg", "Distribution center", "5"],
  ["Detail demo", "Offices & warehouse", "3"],
])("shows the facility details for %s", (site, type, chargingBays) => {
  render(
    <LocationMap
      robot={{ ...robot, site }}
      peers={[]}
      evaluatedAt={Date.parse(robot.createdAt)}
      unverified={false}
    />,
  );

  const location = within(screen.getByRole("region", { name: "Location" }));
  expect(
    location.getByRole("heading", { name: `${site} · Location` }),
  ).toBeVisible();
  expect(location.getByText(type)).toBeVisible();
  expect(location.getByText(chargingBays, { exact: true })).toBeVisible();
});
