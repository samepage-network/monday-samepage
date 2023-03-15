const esbuild = require("esbuild").build;
const fs = require("fs");
const Lambda = require("@aws-sdk/client-lambda").Lambda;
const archiver = require("archiver");
const crypto = require("crypto");

const lambda = new Lambda({});

const getFunction = ({ FunctionName, trial = 0 }) =>
  lambda
    .getFunction({
      FunctionName,
    })
    .catch((e) => {
      if (trial < 100) {
        console.warn(
          `Function ${FunctionName} not found on trial ${trial}. Trying again...`
        );
        return new Promise((resolve) =>
          setTimeout(
            () => resolve(getFunction({ FunctionName, trial: trial + 1 })),
            10000
          )
        );
      } else {
        throw e;
      }
    });

const env = ["MONDAY_PERSONAL_TOKEN"];
const outdir = "out";
const options = {
  date: new Date("01-01-1970"),
};
const buildFunctions = async () => {
  const entryPoints = Object.fromEntries(
    fs
      .readdirSync("src/functions")
      .map((f) => [f.replace(/\.ts$/, ""), `src/functions/${f}`])
  );
  return esbuild({
    bundle: true,
    outdir,
    platform: "node",
    external: ["aws-sdk", "canvas", "@aws-sdk/*"],
    define: Object.fromEntries(
      (typeof env === "string" ? [env] : env || [])
        .filter((s) => !!process.env[s])
        .map((s) => [`process.env.${s}`, `"${process.env[s]}"`])
    ),
    entryPoints,
  }).then((r) => {
    if (r.errors.length) {
      throw new Error(JSON.stringify(r.errors));
    } else {
      return Object.keys(entryPoints);
    }
  });
};

const publishFunctions = async (entries) =>
  Promise.all(
    entries.map((f) => {
      const zip = archiver("zip", { gzip: true, zlib: { level: 9 } });
      console.log(`Zipping ${f}...`);

      zip.file(`${outdir}/${f}.js`, { name: `${outdir}/${f}.js`, ...options });
      const shasum = crypto.createHash("sha256");
      const data = [];
      return new Promise((resolve, reject) =>
        zip
          .on("data", (d) => {
            data.push(d);
            shasum.update(d);
          })
          .on("end", () => {
            console.log(`Zip of ${f} complete (${data.length}).`);
            const sha256 = shasum.digest("base64");
            const FunctionName = `samepage-network_${f}_post`;
            getFunction({
              FunctionName,
            })
              .then((l) => {
                if (sha256 === l.Configuration?.CodeSha256) {
                  return `No need to upload ${FunctionName}, shas match.`;
                } else {
                  return lambda
                    .updateFunctionCode({
                      FunctionName,
                      Publish: true,
                      ZipFile: Buffer.concat(data),
                    })
                    .then(
                      (upd) =>
                        `Succesfully uploaded ${FunctionName} at ${upd.LastModified}`
                    );
                }
              })
              .then(console.log)
              .then(resolve)
              .catch((e) => {
                console.error(`deploy of ${f} failed:`);
                reject(e);
              });
          })
          .finalize()
      );
    })
  );

module.exports = () => {
  return buildFunctions().then(publishFunctions);
};
