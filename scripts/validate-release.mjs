import { readFile } from "node:fs/promises";

const modulePath = new URL("../module.json", import.meta.url);
const manifest = JSON.parse(await readFile(modulePath, "utf8"));
const repository = "https://github.com/black-appel/foundry-mod-five-death-saves";
const releaseTag = process.argv[2];

const errors = [];
if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
  errors.push(`module.json version is not valid SemVer: ${manifest.version}`);
}
if (manifest.id !== "five-death-saves") errors.push(`Unexpected module id: ${manifest.id}`);
if (manifest.url !== repository) errors.push("The repository URL is incorrect.");
if (manifest.manifest !== `${repository}/releases/latest/download/module.json`) {
  errors.push("The stable Foundry manifest URL is incorrect.");
}
if (manifest.download !== `${repository}/releases/download/v${manifest.version}/five-death-saves.zip`) {
  errors.push("The release download URL does not match the module version.");
}
if (releaseTag && releaseTag !== `v${manifest.version}`) {
  errors.push(`Release tag ${releaseTag} must match module version v${manifest.version}.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Release metadata for v${manifest.version} is valid.`);
