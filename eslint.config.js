import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist", "node_modules", "coverage"],
  },
  {
    files: ["src/**/*.{ts,tsx}", "vite.config.ts", "vitest.config.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        Blob: "readonly",
        CryptoKey: "readonly",
        File: "readonly",
        JsonWebKey: "readonly",
        MediaStream: "readonly",
        RTCPeerConnection: "readonly",
        RTCDataChannel: "readonly",
        RTCIceCandidate: "readonly",
        RTCSessionDescription: "readonly",
        crypto: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        window: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
