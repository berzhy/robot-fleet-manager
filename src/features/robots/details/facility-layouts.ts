type PlanPoint = readonly [x: number, y: number];
type FacilityArea = (typeof facilityAreas)[number]["name"];

export type FacilityLayout = {
  footprint: string;
  workrooms: string;
  commonAreas: string;
  walls: string;
  windows: string;
  fixtures: string;
  warehouseRacks: readonly PlanPoint[];
  officeDesks: readonly PlanPoint[];
  chargingBays: readonly PlanPoint[];
  zoneAnchors: Record<FacilityArea, PlanPoint>;
  type: string;
  floorArea: string;
};

export const facilityPlanViewBox = "0 0 1100 544";

export const facilityAreas = [
  { name: "Lobby", label: "Lobby" },
  { name: "Floor 1", label: "Floor 1 · Offices" },
  { name: "Warehouse", label: "Warehouse" },
  { name: "Base", label: "Base" },
] as const;

const munichLayout: FacilityLayout = {
  footprint:
    "M32 66H378V122H548V30H944L1068 116V248H1014V426H676V474H424V420H162V388H32Z",
  workrooms: "M32 66H378V334H330V420H162V388H32Z M548 30H944L1068 116V248H548Z",
  commonAreas: "M378 284H676V474H424V420H330V334H378Z M676 284H1014V426H676Z",
  walls: `M378 122V212 M378 264V334H330V420
          M548 122V248H732 M812 248H1014
          M378 284H470 M548 284H748 M822 284H1014
          M676 284V426`,
  windows: `M72 66H144 M180 66H252 M288 66H342 M32 101V169
            M584 30H646 M674 30H736 M764 30H826 M854 30H916 M961 42L1038 95
            M456 474H544 M572 474H644 M722 426H807 M835 426H920`,
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
  zoneAnchors: {
    Lobby: [452, 350],
    "Floor 1": [582, 126],
    Warehouse: [62, 124],
    Base: [706, 338],
  },
  type: "Offices & warehouse",
  floorArea: "~3,600 m²",
};

const berlinLayout: FacilityLayout = {
  footprint:
    "M38 92H312V36H998V96H1060V422H706V474H408V408H38Z M470 214H674V332H470Z",
  workrooms: "M38 92H312V36H398V408H38Z M398 36H998V96H1060V196H398Z",
  commonAreas: "M398 350H706V474H408V408H398Z M706 196H1060V422H706Z",
  walls: `M398 36V170 M398 234V408
          M398 196H516 M594 196H1060
          M706 196V252 M706 306V422
          M398 350H480 M562 350H706`,
  windows: `M38 117V186 M38 216V291 M38 321V380
            M438 36H528 M556 36H646 M674 36H764 M792 36H882 M910 36H976
            M1060 135V177 M1060 211V270 M1060 306V365
            M448 474H524 M548 474H624`,
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
  zoneAnchors: {
    Lobby: [442, 376],
    "Floor 1": [438, 112],
    Warehouse: [68, 145],
    Base: [734, 306],
  },
  type: "Office & service campus",
  floorArea: "~3,200 m²",
};

const hamburgLayout: FacilityLayout = {
  footprint: "M34 32H604V68H1022V110H1064V366H942V466H476V394H34Z",
  workrooms: "M34 32H364V230H34Z M416 32H604V68H1022V110H1064V306H416Z",
  commonAreas: "M34 230H364V394H34Z M476 334H942V466H476Z",
  walls: `M364 32V154 M364 208V297 M364 350V394 M34 230H364
          M416 32V214 M416 274V306H584 M668 306H1064
          M476 394V334H540 M614 334H942V366`,
  windows: `M66 32H145 M175 32H254 M284 32H338 M34 268V334
            M630 68H712 M744 68H826 M858 68H940
            M506 466H598 M630 466H722 M754 466H846 M878 466H916`,
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
  zoneAnchors: {
    Lobby: [60, 292],
    "Floor 1": [60, 98],
    Warehouse: [448, 130],
    Base: [504, 370],
  },
  type: "Distribution center",
  floorArea: "~4,800 m²",
};

const layoutsBySite = new Map([
  ["munich", munichLayout],
  ["berlin", berlinLayout],
  ["hamburg", hamburgLayout],
]);

export function getFacilityLayout(site: string) {
  return layoutsBySite.get(site.toLowerCase()) ?? munichLayout;
}
