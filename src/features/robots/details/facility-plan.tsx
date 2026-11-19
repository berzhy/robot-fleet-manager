import { useTheme } from "@mui/material/styles";

export const facilityDetails = {
  type: "Offices & warehouse",
  floorArea: "~3,600 m²",
  chargingBays: [474, 526, 578],
};

/** Static architectural context; robot positions are supplied separately. */
export default function FacilityPlan() {
  const theme = useTheme();
  const palette = (theme.vars ?? theme).palette;
  return (
    <g>
      <rect
        x="32"
        y="32"
        width="736"
        height="500"
        rx="2"
        fill={palette.background.paper}
      />
      <path
        d="M40 256H760V302H40Z M392 40H438V524H392Z"
        fill={palette.action.hover}
      />
      <g
        fill="none"
        stroke={palette.text.secondary}
        strokeWidth="5"
        strokeLinejoin="miter"
      >
        <path d="M344 36H764V528H442 M382 528H36V36H282" />
        <path d="M36 256H156 M204 256H392 M438 256H548 M590 256H764 M36 302H156 M204 302H392 M438 302H548 M590 302H764" />
        <path d="M392 36V140 M392 182V256 M438 36V140 M438 182V256 M392 302V410 M392 452V528 M438 302V410 M438 452V528" />
        <path d="M558 36V114 M558 150V186H764 M438 186H480 M522 186H558 M666 36V186" />
        <path d="M36 154H126V36 M670 302V360 M670 406V528" />
      </g>
      <g
        fill="none"
        stroke={palette.text.secondary}
        strokeWidth="1.2"
        opacity="0.65"
      >
        <path d="M282 36V98 A62 62 0 0 0 344 36 M156 256V208 A48 48 0 0 1 204 256 M548 256V214 A42 42 0 0 1 590 256 M156 302V350 A48 48 0 0 0 204 302 M548 302V344 A42 42 0 0 0 590 302 M392 140H350 A42 42 0 0 0 392 182 M438 140H480 A42 42 0 0 1 438 182 M392 410H350 A42 42 0 0 0 392 452 M438 410H480 A42 42 0 0 1 438 452 M558 114H522 A36 36 0 0 0 558 150 M480 186V144 A42 42 0 0 1 522 186 M670 360H716 A46 46 0 0 1 670 406" />
      </g>
      <g stroke={palette.info.main} strokeWidth="3" fill="none">
        <path d="M62 36H110 M158 36H250 M470 36H534 M578 36H646 M688 36H742 M36 182V230 M764 208V240 M764 330V386 M764 444V502 M64 528H144 M190 528H270 M300 528H366 M466 528H530 M570 528H642" />
      </g>
      <g stroke={palette.divider} fill={palette.action.hover} strokeWidth="1.5">
        <path d="M158 84H284V106H180V136H158Z" />
        <rect x="306" y="66" width="38" height="70" rx="4" />
        <rect x="318" y="70" width="22" height="62" rx="2" />
        <rect x="64" y="190" width="60" height="22" rx="4" />
        <rect x="64" y="220" width="60" height="22" rx="4" />
        <rect x="76" y="64" width="20" height="70" />
        <path d="M76 74H96 M76 84H96 M76 94H96 M76 104H96 M76 114H96 M76 124H96" />
        <rect x="462" y="62" width="62" height="24" rx="2" />
        <rect x="462" y="106" width="62" height="24" rx="2" />
        <rect x="580" y="62" width="64" height="30" rx="8" />
        <circle cx="592" cy="52" r="5" />
        <circle cx="630" cy="52" r="5" />
        <circle cx="592" cy="102" r="5" />
        <circle cx="630" cy="102" r="5" />
        <rect x="690" y="62" width="48" height="20" />
        <rect x="690" y="112" width="48" height="20" />
        {[78, 148, 218].map((x) => (
          <g key={x}>
            <rect x={x} y="356" width="32" height="132" rx="1" />
            {[378, 400, 422, 444, 466].map((y) => (
              <path key={y} d={`M${x} ${y}h32`} />
            ))}
          </g>
        ))}
        <rect x="694" y="438" width="46" height="20" />
        <rect x="694" y="480" width="46" height="20" />
        <circle cx="64" cy="64" r="10" />
        <circle cx="352" cy="224" r="10" />
        <path d="M58 64h12 M64 58v12 M346 224h12 M352 218v12" />
      </g>
      <g fill="none" stroke={palette.info.main} strokeWidth="1.5">
        {facilityDetails.chargingBays.map((x) => (
          <g key={x}>
            <rect x={x} y="342" width="32" height="48" rx="3" />
            <path d={`M${x + 4} 386h24 M${x + 18} 350l-8 15h12l-8 15`} />
            <path d={`M${x - 4} 396v10h40v-10`} strokeDasharray="3 3" />
          </g>
        ))}
      </g>
      <g
        fill={palette.text.primary}
        fontSize="12"
        fontWeight="600"
        letterSpacing="1"
      >
        <text x="158" y="64">
          RECEPTION
        </text>
        <text x="58" y="176">
          STAIRS
        </text>
        <text x="284" y="242">
          LOBBY
        </text>
        <text x="456" y="206">
          FLOOR 1 · OFFICES
        </text>
        <text x="66" y="330">
          WAREHOUSE
        </text>
        <text x="500" y="426">
          BASE / CHARGING
        </text>
        <text x="688" y="326">
          SERVICE
        </text>
        <text x="290" y="284">
          MAIN CORRIDOR
        </text>
      </g>
      <g fill={palette.text.secondary} fontSize="10">
        <text x="42" y="566">
          FACILITY PLAN
        </text>
        <path
          d="M44 582H144 M44 578v8 M94 578v8 M144 578v8"
          stroke="currentColor"
        />
        <text x="44" y="600">
          0
        </text>
        <text x="124" y="600">
          10 m
        </text>
        <path
          d="M730 576V550l-5 10 M730 550l5 10"
          stroke="currentColor"
          fill="none"
        />
        <text x="726" y="544">
          N
        </text>
      </g>
    </g>
  );
}
