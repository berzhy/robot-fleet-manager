import { runSimulator } from "../src/simulator/simulator";
const controller = new AbortController();
const stop = () => controller.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
async function main() {
  try {
    await runSimulator(
      process.env.SIMULATOR_API_URL ?? "http://localhost:3000",
      controller.signal,
    );
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
void main().catch((reason) => {
  console.error(reason);
  process.exitCode = 1;
});
