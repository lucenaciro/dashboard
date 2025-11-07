import { runImport } from "./run-import";

runImport(false)
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error("import:real:error", error);
    if (error?.meta?.responseJSON) {
      console.error("import:real:meta", JSON.stringify(error.meta.responseJSON, null, 2));
    }
    process.exitCode = 1;
  });
