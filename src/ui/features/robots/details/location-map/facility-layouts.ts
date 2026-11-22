export type PlanPoint = readonly [x: number, y: number];
export type FacilityArea = (typeof facilityAreas)[number]["name"];

export type FacilityLayout = {
  footprint: string;
  walls: string;
  fixtures: string;
  warehouseRacks: readonly PlanPoint[];
  officeDesks: readonly PlanPoint[];
  chargingBays: readonly PlanPoint[];
  /** Top-left corner of each area's label, in plan units. */
  labelAnchors: Record<FacilityArea, PlanPoint>;
  /** Describes the real site, so a generic drawing has none. */
  details?: { type: string; floorArea: string };
};

/** The plan's coordinate space; layouts draw within it. */
export const planWidth = 1100;
export const planHeight = 544;

export const facilityAreas = [
  { name: "Lobby", label: "Lobby" },
  { name: "Floor 1", label: "Floor 1 · Offices" },
  { name: "Warehouse", label: "Warehouse" },
  { name: "Base", label: "Base" },
] as const;

const munichLayout: FacilityLayout = {
  footprint:
    "M32 66H378V122H548V30H944L1068 116V248H1014V426H676V474H424V420H162V388H32Z",
  walls: `M378 122V212 M378 264V334H330V420
          M548 122V248H732 M812 248H1014
          M378 284H470 M548 284H748 M822 284H1014
          M676 284V426`,
  fixtures: `M414 151h96v54h-96z M426 151v54 M438 151v54 M450 151v54 M462 151v54 M474 151v54 M486 151v54 M498 151v54
             M452 454v-22h80v10h-68v12z
             M575 438h66q3 0 3 3v11q0 3-3 3h-66q-3 0-3-3v-11q0-3 3-3z M596 438v17 M620 438v17`,
  warehouseRacks: [
    [62, 228],
    [134, 228],
    [206, 228],
    [278, 228],
  ],
  officeDesks: [
    [586, 54],
    [680, 54],
    [774, 54],
    [914, 126],
    [914, 181],
  ],
  chargingBays: [
    [874, 301],
    [918, 301],
    [962, 301],
  ],
  labelAnchors: {
    Lobby: [452, 324],
    "Floor 1": [582, 100],
    Warehouse: [62, 98],
    Base: [706, 312],
  },
  details: { type: "Offices & warehouse", floorArea: "~3,600 m²" },
};

const berlinLayout: FacilityLayout = {
  footprint:
    "M38 92H312V36H998V96H1060V422H706V474H408V408H38Z M470 214H674V332H470Z",
  walls: `M398 36V170 M398 234V408
          M398 196H516 M594 196H1060
          M706 196V252 M706 306V422
          M398 350H480 M562 350H706`,
  fixtures: `M744 110h116v34h-116z M760 104h28v6 M815 104h28v6 M760 144h28v6 M815 144h28v6
             M439 456v-12h94v12z M470 444v12 M502 444v12
             M590 454v-12h80v12z M630 442v12`,
  warehouseRacks: [
    [68, 246],
    [146, 246],
    [224, 246],
    [302, 246],
  ],
  officeDesks: [
    [744, 54],
    [834, 54],
    [924, 54],
    [894, 126],
    [976, 126],
  ],
  chargingBays: [
    [946, 245],
    [992, 245],
    [946, 308],
    [992, 308],
  ],
  labelAnchors: {
    Lobby: [442, 350],
    "Floor 1": [438, 86],
    Warehouse: [68, 119],
    Base: [734, 280],
  },
  details: { type: "Office & service campus", floorArea: "~3,200 m²" },
};

const hamburgLayout: FacilityLayout = {
  footprint: "M34 32H604V68H1022V110H1064V366H942V466H476V394H34Z",
  walls: `M364 32V154 M364 208V297 M364 350V394 M34 230H364
          M416 32V214 M416 274V306H584 M668 306H1064
          M476 394V334H540 M614 334H942V366`,
  fixtures: `M82 199h115v14H82z M120 199v14 M158 199v14
             M253 274h83v14h-69v31h-14z
             M993 137h71v30h-71z M993 190h71v30h-71z M993 243h71v30h-71z
             M1038 137v30 M1038 190v30 M1038 243v30`,
  warehouseRacks: [
    [644, 132],
    [710, 132],
    [776, 132],
    [842, 132],
    [908, 132],
  ],
  officeDesks: [
    [267, 116],
    [267, 173],
  ],
  chargingBays: [
    [716, 368],
    [760, 368],
    [804, 368],
    [848, 368],
    [892, 368],
  ],
  labelAnchors: {
    Lobby: [60, 266],
    "Floor 1": [60, 72],
    Warehouse: [448, 104],
    Base: [504, 344],
  },
  details: { type: "Distribution center", floorArea: "~4,800 m²" },
};

const layoutsBySite = new Map([
  ["munich", munichLayout],
  ["berlin", berlinLayout],
  ["hamburg", hamburgLayout],
]);

// A site without its own drawing gets a generic one, so its robots still show
// in their reported areas.
const genericLayout: FacilityLayout = { ...munichLayout, details: undefined };

export function getFacilityLayout(site: string) {
  return layoutsBySite.get(site.toLowerCase()) ?? genericLayout;
}
