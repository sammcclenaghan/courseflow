import { runCatalogImportCli } from "../src/importer/catalogImport.cli.ts";

await runCatalogImportCli(process.argv.slice(2));
