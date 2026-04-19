import costaRicaMap from "@/assets/costa-rica-map.png";

export const CostaRicaMapBg = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <img
      src={costaRicaMap}
      alt=""
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] max-w-none opacity-[0.04] select-none"
      aria-hidden="true"
    />
  </div>
);
