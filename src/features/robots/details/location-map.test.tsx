import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { render } from "@/test/render";
import { testRobot } from "@/test/robots";

import LocationMap from "./location-map";

const robot = testRobot({ activity: "charging" });

const evaluatedAt = Date.parse(robot.createdAt);
const freshReport = new Date(evaluatedAt).toISOString();

test("each area counts the other robots in it and separates unknown areas", () => {
  const peers = Array.from({ length: 17 }, (_, index) => ({
    id: `peer-${index}`,
    name: `Peer ${index}`,
    area: "Lobby",
    lastReceivedAt: null,
  }));
  render(
    <LocationMap
      robot={{ ...robot, area: "Lobby", lastReceivedAt: freshReport }}
      peers={[...peers, { ...peers[0], id: "unknown", area: "Unmapped" }]}
      evaluatedAt={evaluatedAt}
      unverified={false}
    />,
  );

  expect(screen.getByRole("heading", { name: "Munich" })).toBeInTheDocument();
  expect(screen.getByText("17 other robots")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "This robot" })).toBeInTheDocument();
  expect(
    screen.getByText("Lobby: this robot, 17 other robots"),
  ).toBeInTheDocument();
  expect(screen.getByText("Area unknown: 1 other robot")).toBeInTheDocument();
  expect(screen.getByText("This robot")).toBeInTheDocument();
});

test("a robot outside the plan is listed as in an unknown area", () => {
  render(
    <LocationMap
      robot={robot}
      peers={[]}
      evaluatedAt={evaluatedAt}
      unverified={false}
    />,
  );

  expect(screen.getByText("Area unknown: this robot")).toBeInTheDocument();
  expect(
    screen.queryByRole("img", { name: /This robot/ }),
  ).not.toBeInTheDocument();
});

test.each([
  ["stale", { lastReceivedAt: "2026-11-14T11:00:00.000Z" }, false],
  ["unverified", { lastReceivedAt: freshReport }, true],
  [
    "position lost",
    { lastReceivedAt: freshReport, problemCode: "position-lost" as const },
    false,
  ],
])(
  "a %s robot is shown at its last reported area",
  (_state, changes, unverified) => {
    render(
      <LocationMap
        robot={{ ...robot, area: "Base", ...changes }}
        peers={[]}
        evaluatedAt={evaluatedAt}
        unverified={unverified}
      />,
    );

    expect(
      screen.getByRole("img", { name: "This robot, last reported here" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This robot, last reported area"),
    ).toBeInTheDocument();
  },
);

test("each site with a drawing gets its own, and other sites a generic one", () => {
  function planFor(site: string) {
    const { container, unmount } = render(
      <LocationMap
        robot={{ ...robot, site }}
        peers={[]}
        evaluatedAt={evaluatedAt}
        unverified={false}
      />,
    );
    const plan = container.querySelector("svg")?.innerHTML;
    unmount();
    return plan;
  }

  const plans = ["Munich", "Berlin", "Hamburg"].map(planFor);

  expect(new Set(plans).size).toBe(3);
  expect(planFor("Detail demo")).toBe(plans[0]);
});

test.each([
  ["Munich", "Offices & warehouse · ~3,600 m²"],
  ["Berlin", "Office & service campus · ~3,200 m²"],
  ["Hamburg", "Distribution center · ~4,800 m²"],
])("%s describes its facility", (site, details) => {
  render(
    <LocationMap
      robot={{ ...robot, site }}
      peers={[]}
      evaluatedAt={evaluatedAt}
      unverified={false}
    />,
  );

  expect(screen.getByText(details)).toBeInTheDocument();
});

test("a site with the generic drawing does not borrow another site's details", () => {
  render(
    <LocationMap
      robot={{ ...robot, site: "Detail demo" }}
      peers={[]}
      evaluatedAt={evaluatedAt}
      unverified={false}
    />,
  );

  expect(
    screen.getByRole("heading", { name: "Detail demo" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/m²/)).not.toBeInTheDocument();
});
