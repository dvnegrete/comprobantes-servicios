import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Comprobante from "../comprobante.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Comprobante />
  </StrictMode>
);
