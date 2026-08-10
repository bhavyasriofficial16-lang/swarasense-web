// Coordinates are fractions (0-1) of the body image's width/height, so the
// glow points stay correctly placed at any render size on any screen.
export const SWARA_CONFIG = {
  Sa: { label: "Sa", bodyPart: "foot", color: "#E63946", x: 0.5, y: 0.83 },
  Re: { label: "Re", bodyPart: "knee", color: "#F4A261", x: 0.5, y: 0.64 },
  Ga: { label: "Ga", bodyPart: "navel", color: "#E9C46A", x: 0.5, y: 0.39 },
  Ma: { label: "Ma", bodyPart: "chest", color: "#2A9D8F", x: 0.5, y: 0.265 },
  Pa: { label: "Pa", bodyPart: "neck", color: "#457B9D", x: 0.5, y: 0.2 },
  Dha: { label: "Dha", bodyPart: "forehead", color: "#6D5DAD", x: 0.5, y: 0.125 },
  Ni: { label: "Ni", bodyPart: "head", color: "#B5179E", x: 0.5, y: 0.075 },
};

export const SWARA_ORDER = ["Sa", "Re", "Ga", "Ma", "Pa", "Dha", "Ni"];
