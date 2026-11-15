import type { CreateRobotInput } from "@/modules/robots/robot-validation";

const manufacturers = [
  "Northstar Robotics",
  "Orbit Machines",
  "Nova Automation",
];
const sites = ["Munich", "Berlin", "Hamburg"];

export function generateRobotInput(): CreateRobotInput {
  return {
    name: `Robot ${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    manufacturer:
      manufacturers[Math.floor(Math.random() * manufacturers.length)],
    site: sites[Math.floor(Math.random() * sites.length)],
  };
}
