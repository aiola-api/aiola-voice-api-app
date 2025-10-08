// App constants
export const APP_VERSION = __APP_VERSION__;

// Import package.json to read version dynamically
import packageJson from "../../package.json";
export const AIOLA_SDK_VERSION = packageJson.dependencies["@aiola/sdk"].replace(
  "^",
  ""
);
export const APP_PACKAGE_VERSION = packageJson.version;
