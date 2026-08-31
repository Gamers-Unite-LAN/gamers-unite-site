import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const endpointFiles = readdirSync(__dirname).filter(
  (file) =>
    file.endsWith(".js") &&
    file !== "index.js" &&
    !file.endsWith(".test.js"),
);

const endpointModules = await Promise.all(
  endpointFiles.map(async (file) => {
    const filePath = join(__dirname, file);
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    return {
      file,
      register: mod.default || mod.register,
    };
  }),
);

export function loadEndpoints(app, context) {
  for (const { register } of endpointModules) {
    if (typeof register === "function") {
      register(app, context);
    }
  }
}
