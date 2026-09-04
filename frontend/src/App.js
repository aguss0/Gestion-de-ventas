import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Clientes }      from "./pages/clientes/Clientes";
import { Articulos }     from "./pages/articulos/Articulos";
import { Descartables } from "./pages/descartables/Descartables";
import { Dietetica } from "./pages/dietetica/Dietetica";
import { Vendedores }    from "./pages/vendedores/Vendedores";
import { Pedidos }       from "./pages/pedidos/Pedidos";
import { NuevoPedido }   from "./pages/pedidos/NuevoPedido";
import { Pagos }         from "./pages/pagos/Pagos";
import { EstadoCuenta }  from "./pages/estadocuenta/EstadoCuenta";
import { Comisiones }    from "./pages/comisiones/Comisiones";
import { DetallePedido } from "./pages/pedidos/DetallePedido";
import { DieteticaStock } from "./pages/dietetica/DieteticaStock";
import { HistorialListas } from "./pages/historiallistas/HistorialListas";


const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<Navigate to="/pedidos" />} />
          <Route path="/pedidos"         element={<Pedidos />} />
          <Route path="/pedidos/nuevo"   element={<NuevoPedido />} />
          <Route path="/pedidos/:id/editar" element={<NuevoPedido />} />
          <Route path="/pagos"           element={<Pagos />} />
          <Route path="/estadocuenta"    element={<EstadoCuenta />} />
          <Route path="/comisiones"      element={<Comisiones />} />
          <Route path="/clientes"        element={<Clientes />} />
          <Route path="/articulos"       element={<Articulos />} />
          <Route path="/descartables" element={<Descartables />} />
          <Route path="/mf" element={<Dietetica />} />
          <Route path="/dietetica" element={<DieteticaStock />} />
          <Route path="/historial-listas" element={<HistorialListas />} />
          <Route path="/vendedores"      element={<Vendedores />} />
          <Route path="/pedidos/:id" element={<DetallePedido />} />
          <Route path="/comprasstock" element={<Navigate replace to="/dietetica?vista=compras" />} />
          <Route path="/rentabilidad" element={<Navigate replace to="/dietetica?vista=rentabilidad" />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
