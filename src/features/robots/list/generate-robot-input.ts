import { integrationTypes } from "@/modules/robots/robot";
import type { CreateRobotInput } from "@/modules/robots/robot-validation";

const robotProfiles = [
  { manufacturer: "Samsung", type: "cleaning" },
  { manufacturer: "iRobot", type: "cleaning" },
  { manufacturer: "LG", type: "delivery" },
  { manufacturer: "Ascento", type: "security" },
  { manufacturer: "Boston Dynamics", type: "inspection" },
] satisfies Pick<CreateRobotInput, "manufacturer" | "type">[];
const sites = ["Munich", "Berlin", "Hamburg"];

export function generateRobotInput(): CreateRobotInput {
  return {
    name: `Robot ${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    ...robotProfiles[Math.floor(Math.random() * robotProfiles.length)],
    integrationType:
      integrationTypes[Math.floor(Math.random() * integrationTypes.length)],
    site: sites[Math.floor(Math.random() * sites.length)],
  };
}
