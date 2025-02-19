/* eslint-disable no-console */
/* eslint-disable global-require */

const chalk = require('chalk');
const semver = require('semver');
const shell = require('shelljs');
const packageConfig = require('../../package.json');

function exec(cmd) {
  return require('child_process').execSync(cmd).toString().trim();
}

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

const versionRequirements = [
  {
    name: 'node',
    currentVersion: semver.clean(process.version),
    versionRequirement: packageConfig.engines.node,
  },
];

if (shell.which('npm')) {
  versionRequirements.push({
    name: 'npm',
    currentVersion: exec('npm --version'),
    versionRequirement: packageConfig.engines.npm,
  });
}

module.exports = () => {
  const warnings = [];
  for (let i = 0; i < versionRequirements.length; i++) {
    const mod = versionRequirements[i];
    if (!semver.satisfies(mod.currentVersion, mod.versionRequirement)) {
      warnings.push(`${mod.name}: ${
        chalk.red(mod.currentVersion)} should be ${
        chalk.green(mod.versionRequirement)}`);
    }
  }

  if (!process.env.MONGO_DB) {
    warnings.push(`env.MONGO_DB: ${chalk.white.bgRed.bold("Database connect isn't defined")}`);
  }
  if (process.env.HTTPLOG === null || process.env.HTTPLOG === undefined) {
    warnings.push(`env.HTTPLOG: ${chalk.white.bgRed.bold("HTTPLOG isn't defined. Use 'true' or 'false'")}`);
  }
  if (!process.env.FIREBASE_JSON_CONFIG) {
    warnings.push(`env.FIREBASE_JSON_CONFIG: ${chalk.white.bgRed.bold('The Firebase configuration keys is not defined in the startup variables')}`);
  }
  if (process.env.FIREBASE_JSON_CONFIG && !IsJsonString(process.env.FIREBASE_JSON_CONFIG)) {
    warnings.push(`env.FIREBASE_JSON_CONFIG: ${chalk.white.bgRed.bold('The Firebase configuration keys are not in a valid JSON object format')}`);
  }

  if (warnings.length) {
    console.log('');
    console.log(chalk.yellow('To use this template, you must update following to modules:'));
    console.log();
    for (let i = 0; i < warnings.length; i++) {
      const warning = warnings[i];
      console.log(`  ${warning}`);
    }
    console.log();
    process.exit(1);
  }
};
