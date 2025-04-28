import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Hereda las reglas base de Next.js
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // -------- AÑADIR ESTE OBJETO --------
  // Sobreescribe reglas específicas
  {
    rules: {
      // Cambia la regla 'no-explicit-any' a una advertencia ('warn')
      "@typescript-eslint/no-explicit-any": "warn",

      // Aquí puedes añadir o sobreescribir otras reglas si lo necesitas
      // Ejemplo: "no-console": "off",
    },
  },
  // ------------------------------------
];

export default eslintConfig;