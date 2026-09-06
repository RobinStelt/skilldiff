import pc from "picocolors";
import { loadOrCreateConfig, setConfigValue, type ConfigurableKey } from "../config/localConfig.js";

const VALID_KEYS: readonly ConfigurableKey[] = ["endpoint", "claude-bin"];

function assertValidKey(key: string): asserts key is ConfigurableKey {
  if (!(VALID_KEYS as readonly string[]).includes(key)) {
    throw new Error(`Unknown config key "${key}" — valid keys: ${VALID_KEYS.join(", ")}`);
  }
}

export function configSetCommand(key: string, value: string): void {
  assertValidKey(key);
  const config = loadOrCreateConfig();
  setConfigValue(config, key, value);
  console.log(pc.green(`✓ ${key} = ${value}`));
}

export function configUnsetCommand(key: string): void {
  assertValidKey(key);
  const config = loadOrCreateConfig();
  setConfigValue(config, key, null);
  console.log(pc.green(`✓ ${key} cleared`));
}

export function configShowCommand(): void {
  const config = loadOrCreateConfig();
  console.log(`endpoint\t${config.endpointUrl ?? pc.dim("(not set)")}`);
  console.log(`claude-bin\t${config.claudeBinOverride ?? pc.dim("(not set — auto-detected)")}`);
}
