import { runImport } from "./run-import";

runImport(true)
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error("import:dry:error", error);
    if (error?.meta?.responseJSON) {
      console.error("import:dry:meta", JSON.stringify(error.meta.responseJSON, null, 2));
    }
    process.exitCode = 1;
  });
