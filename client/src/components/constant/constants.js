export const MAIN_TYPES = [
    "warehouse",
    "building",
    "floor",
    "room",
    "aisle",
    "rack",
    "shelf",
    "bin",
    "slot",
    "pallet",
    "container",
    "yard",
    "campus","root"
];

export const STACKING_TYPES = ["vertical stack", "horizontal stack", "grid"];

export const STACKING_ALLOWED_FOR = {
    warehouse: STACKING_TYPES,
    building: STACKING_TYPES,
    floor: STACKING_TYPES,
    room: [],
    aisle: [],
    rack: ["vertical stack"],
    shelf: ["grid"],
    bin: [],
    slot: [],
    pallet: STACKING_TYPES,
    container: STACKING_TYPES,
    yard: STACKING_TYPES,
    root: [],
};

export const TYPE_COLORS = {
    warehouse:  "#e6f7f5",
    building: "#e8f4ff",
    floor: "#fff5e6",
    room: "#e6ffe6",
    aisle: "#fff0f6",
    rack: "#ffe6f2",
    shelf: "#f3e6ff",
    bin: "#e6faff",
    slot: "#f9ffe6",
    pallet: "#ffe6cc",
    container: "#e6f0ff",
    yard: "#f3f0ff",
    "vertical stack": "#e6ffe6",
    "horizontal stack": "#fff0f6",
    grid: "#e6faff",
    root: "#ededed",
    campus: "#ededed",
};

export const DEFAULT_LOCATION = {
    code: "ROOT",
    name: "Root Location",
    type: "root",
    stack: null,
    children: [],
};
