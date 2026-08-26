import { useState, useMemo } from "react";

export function useOrden(datos, ordenInicial = { campo: null, dir: "asc" }) {
  const [orden, setOrden] = useState(ordenInicial);

  const toggleOrden = (campo) => {
    setOrden(prev =>
      prev.campo === campo
        ? { campo, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { campo, dir: "asc" }
    );
  };

  const datosordenados = useMemo(() => {
    if (!orden.campo) return datos;
    return [...datos].sort((a, b) => {
      let va = orden.campo.split(".").reduce((o, k) => o?.[k], a);
      let vb = orden.campo.split(".").reduce((o, k) => o?.[k], b);

      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();

      if (va < vb) return orden.dir === "asc" ? -1 : 1;
      if (va > vb) return orden.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [datos, orden]);

  return { datosordenados, orden, toggleOrden };
}