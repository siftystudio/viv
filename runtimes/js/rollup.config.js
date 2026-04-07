import { createRequire } from "node:module";

import sourcemaps from "rollup-plugin-sourcemaps";
import json from '@rollup/plugin-json';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/** @type {import('rollup').RollupOptions[]} */
export default [
    {
        input: "temp/index.js",
        output: [
            {
                file: "dist/index.js",
                format: "esm",
                sourcemap: true
            },
            {
                file: "dist/index.cjs",
                format: "cjs",
                sourcemap: true,
                exports: "named"
            }
        ],
        // Circular dependencies between runtime subsystems are safe here. All files are purely
        // composed of function/type definitions with no top-level side effects, meaning every
        // import is fully resolved by the time any function body executes.
        onwarn(warning, warn) {
            if (warning.code === "CIRCULAR_DEPENDENCY") return;
            warn(warning);
        },
        external: Object.keys(pkg.dependencies || {}),
        plugins: [
            sourcemaps(),
            json(),
            resolve({ extensions: [".mjs", ".js", ".json"] }),
            commonjs(),
            terser({
                keep_classnames: true,
                keep_fnames: true,
                format: { comments: /^!|@preserve|@license|@cc_on/i }
            })
        ]
    }
];
