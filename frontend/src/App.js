import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Clientes }      from "./pages/clientes/Clientes";
import { Articulos }     from "./pages/articulos/Articulos";
import { Vendedores }    from "./pages/vendedores/Vendedores";
import { Pedidos }       from "./pages/pedidos/Pedidos";
import { NuevoPedido }   from "./pages/pedidos/NuevoPedido";
import { Pagos }         from "./pages/pagos/Pagos";
import { EstadoCuenta }  from "./pages/estadocuenta/EstadoCuenta";
import { Comisiones }    from "./pages/comisiones/Comisiones";
import { DetallePedido } from "./pages/pedidos/DetallePedido";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<Navigate to="/pedidos" />} />
          <Route path="/pedidos"         element={<Pedidos />} />
          <Route path="/pedidos/nuevo"   element={<NuevoPedido />} />
          <Route path="/pagos"           element={<Pagos />} />
          <Route path="/estadocuenta"    element={<EstadoCuenta />} />
          <Route path="/comisiones"      element={<Comisiones />} />
          <Route path="/clientes"        element={<Clientes />} />
          <Route path="/articulos"       element={<Articulos />} />
          <Route path="/vendedores"      element={<Vendedores />} />
          <Route path="/pedidos/:id" element={<DetallePedido />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}