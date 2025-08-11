import { defineConfig } from "cypress";

export default defineConfig({
  theme: 'dark',
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});