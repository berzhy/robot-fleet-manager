import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { Activity } from "react";
import { afterEach, expect, test, vi } from "vitest";

import type { Robot, RobotAction } from "@/common/types";
import { render } from "@/ui/test-render";

import { testRobot, workingRobot } from "./test-robots";
import useRobotAction from "./use-robot-action";

afterEach(() => vi.unstubAllGlobals());

function reportingRobot(id: string) {
  return testRobot({
    ...workingRobot,
    id,
    lastReceivedAt: new Date().toISOString(),
  });
}

function Controls({ robot, label }: { robot: Robot; label: string }) {
  const { requestAction, pendingAction, unavailableReason } =
    useRobotAction(robot);
  const actions: RobotAction[] = ["stop", "return-to-base"];

  return (
    <div>
      {actions.map((action) => (
        <button key={action} onClick={() => requestAction(action)}>
          {label} {action}
        </button>
      ))}
      <output aria-label={`${label} pending`}>{pendingAction ?? "none"}</output>
      <output aria-label={`${label} reason`}>
        {unavailableReason("stop") ?? "available"}
      </output>
    </div>
  );
}

/** Holds every command until the test answers it. */
function stubCommands() {
  const answers: ((response: Response) => void)[] = [];
  const fetcher = vi.fn(
    () => new Promise<Response>((resolve) => answers.push(resolve)),
  );
  vi.stubGlobal("fetch", fetcher);
  return { fetcher, answers };
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

const robot = reportingRobot("one");

test("clicks before the next render send one command", async () => {
  const { fetcher } = stubCommands();
  render(<Controls robot={robot} label="row" />);

  act(() => {
    click("row stop");
    click("row stop");
    click("row return-to-base");
  });

  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("a remounted control still sees the command in flight", async () => {
  const { fetcher } = stubCommands();
  const { rerender } = render(
    <Controls key="first" robot={robot} label="row" />,
  );
  click("row stop");
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

  rerender(<></>);
  rerender(<Controls key="second" robot={robot} label="row" />);

  expect(screen.getByLabelText("row pending")).toHaveTextContent("stop");
  expect(screen.getByLabelText("row reason")).toHaveTextContent(
    "Sending command…",
  );
  click("row return-to-base");
  await act(() => Promise.resolve());
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("two screens of one robot share the command in flight", async () => {
  const { fetcher } = stubCommands();
  render(
    <>
      <Controls robot={robot} label="list" />
      <Controls robot={robot} label="details" />
    </>,
  );

  click("list stop");
  await waitFor(() =>
    expect(screen.getByLabelText("details pending")).toHaveTextContent("stop"),
  );
  click("details return-to-base");
  await act(() => Promise.resolve());

  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("a screen hidden during a command still holds it when shown again", async () => {
  const { fetcher } = stubCommands();
  const tree = (mode: "visible" | "hidden") => (
    <>
      <Activity mode={mode}>
        <Controls robot={robot} label="details" />
      </Activity>
      {mode === "hidden" && <Controls robot={robot} label="list" />}
    </>
  );
  const { rerender } = render(tree("visible"));
  click("details stop");
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

  rerender(tree("hidden"));
  expect(screen.getByLabelText("list pending")).toHaveTextContent("stop");
  click("list return-to-base");
  await act(() => Promise.resolve());
  expect(fetcher).toHaveBeenCalledTimes(1);

  rerender(tree("visible"));
  expect(screen.getByLabelText("details pending")).toHaveTextContent("stop");
});

test("a command for one robot does not hold up another", async () => {
  const { fetcher } = stubCommands();
  render(
    <>
      <Controls robot={robot} label="first" />
      <Controls robot={reportingRobot("two")} label="second" />
    </>,
  );

  click("first stop");
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText("second pending")).toHaveTextContent("none");
  click("second stop");

  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
});

test("the robot takes a new command once the last one has failed", async () => {
  const { fetcher, answers } = stubCommands();
  render(<Controls robot={robot} label="row" />);

  click("row stop");
  await waitFor(() => expect(answers).toHaveLength(1));
  act(() => answers[0](new Response(null, { status: 500 })));
  await waitFor(() =>
    expect(screen.getByLabelText("row pending")).toHaveTextContent("none"),
  );

  click("row stop");
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
});
