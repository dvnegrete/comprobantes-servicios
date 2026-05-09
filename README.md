# 🧱 Comprobante de Servicios de Albañilería

Aplicación web para generar comprobantes de trabajos de albañilería y construcción. Diseñada para prestadores de servicios informales que no pueden emitir facturas fiscales (CFDI), pero cuyos clientes necesitan documentar sus gastos.

---

## ✨ Funcionalidades

- **Formulario de captura** con todos los campos necesarios para un comprobante profesional
- **Vista previa** del documento antes de exportar
- **Descarga en PDF** generado directamente en el navegador (sin servidor)
- **Impresión directa** optimizada con CSS `@media print`
- **Paginación automática** si el recibo supera una hoja A4
- **Total en letras** generado automáticamente (ej. _CINCO MIL PESOS 00/100 M.N._)
- **Anticipos descontables** del total final
- Responsive — funciona en móvil y escritorio

---

## 📋 Campos del comprobante

| Sección | Campos |
|---|---|
| Encabezado | Folio, Fecha, Forma de pago |
| Prestador | Nombre, Teléfono, Domicilio |
| Cliente | Nombre, Teléfono, Dirección de la obra |
| Trabajos | Concepto, Unidad, Cantidad, Precio unitario, Importe |
| Totales | Subtotal, Anticipo(s), Saldo a pagar |
| Pie | Observaciones, Firmas, Nota legal |

---

## 🛠️ Tecnologías

- [React 19](https://react.dev/) — UI y estado
- [jsPDF 2.5](https://github.com/parallax/jsPDF) — Generación de PDF en el cliente
- [html2canvas 1.4](https://html2canvas.hertzen.com/) — Captura del DOM como imagen
- CSS-in-JS puro (sin frameworks de estilos)
- Fuentes: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) + [Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3) vía Google Fonts

> `jsPDF` y `html2canvas` se cargan dinámicamente desde CDN (cdnjs.cloudflare.com), sin necesidad de instalarlos como dependencias.

---

## 🚀 Uso

### Como artifact en Claude

Abre el archivo `.jsx` directamente como artifact en [claude.ai](https://claude.ai). No requiere instalación.

### Como proyecto React local

```bash
# 1. Crear proyecto
npm create vite@latest comprobante-albanileria -- --template react
cd comprobante-albanileria

# 2. Reemplazar src/App.jsx con el contenido de comprobante-albanileria.jsx

# 3. Correr en desarrollo
npm install
npm run dev
```

---

## 📄 Nota legal

El documento generado es un **comprobante privado entre partes**. No sustituye a una factura fiscal electrónica (CFDI) emitida por el SAT. Su validez como comprobante de gasto depende del acuerdo entre el prestador y el cliente, y de las políticas internas de quien lo recibe.

---

## 📁 Estructura del proyecto

```
comprobante-albanileria/
├── comprobante-albanileria.jsx   # Componente principal (todo en un archivo)
└── README.md
```

---

## 🖼️ Vista previa

El comprobante generado incluye:

- Encabezado con título y leyenda _"Documento no fiscal"_
- Tabla detallada de trabajos y materiales
- Total en número y en letras
- Espacio para firma del prestador y del cliente
- Nota legal al pie

---

Desarrollado con ❤️ usando [Claude](https://claude.ai)
