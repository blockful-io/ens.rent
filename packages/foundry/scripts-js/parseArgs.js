import { spawnSync } from "child_process";
import { config } from "dotenv";
import { join, dirname } from "path";
import { readFileSync } from "fs";
import { parse } from "toml";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config();

// Get all arguments after the script name
const args = process.argv.slice(2);
let fileName = "Deploy.s.sol";
let network = "localhost";

// Show help message if --help is provided
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: npm run deploy [options]
Options:
  --file <filename>     Specify the deployment script file (default: Deploy.s.sol)
  --network <network>   Specify the network (default: localhost)
  --help, -h           Show this help message
Examples:
  npm run deploy --file DeployYourContract.s.sol --network sepolia
  npm run deploy --network sepolia
  npm run deploy --file DeployYourContract.s.sol
  npm run deploy
  `);
  process.exit(0);
}

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i].match(/^network=/)) {
    network = args[i].split("=")[1];
  } else if (args[i].match(/^file=/)) {
    fileName = args[i].split("=")[1];
  }
}

// Check if the network exists in rpc_endpoints
try {
  const foundryTomlPath = join(__dirname, "..", "..", "..", "foundry.toml");
  const tomlString = readFileSync(foundryTomlPath, "utf-8");
  const parsedToml = parse(tomlString);

  if (!parsedToml.rpc_endpoints[network]) {
    console.log(
      `\n❌ Error: Network '${network}' not found in foundry.toml!`,
      "\nPlease check `foundry.toml` for available networks in the [rpc_endpoints] section or add a new network."
    );
    process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Error reading or parsing foundry.toml:", error);
  process.exit(1);
}

// Check for default account on live network
if (
  process.env.ETH_KEYSTORE_ACCOUNT === "scaffold-eth-default" &&
  network !== "localhost"
) {
  console.log(`
❌ Error: Cannot deploy to live network using default keystore account!

To deploy to ${network}, please follow these steps:

1. If you haven't generated a keystore account yet:
   $ npm run generate

2. Update your .env file:
   ETH_KEYSTORE_ACCOUNT='scaffold-eth-custom'

The default account (scaffold-eth-default) can only be used for localhost deployments.
`);
  process.exit(0);
}

if (
  process.env.ETH_KEYSTORE_ACCOUNT !== "scaffold-eth-default" &&
  network === "localhost"
) {
  console.log(`
⚠️ Warning: Using ${process.env.ETH_KEYSTORE_ACCOUNT} keystore account on localhost.

You can either:
1. Enter the password for ${process.env.ETH_KEYSTORE_ACCOUNT} account
   OR
2. Set the default keystore account in your .env and re-run the command to skip password prompt:
   ETH_KEYSTORE_ACCOUNT='scaffold-eth-default'
`);
}

// Set environment variables for the make command
process.env.DEPLOY_SCRIPT = `script/${fileName}`;
process.env.RPC_URL = network;

const result = spawnSync(
  "make",
  [
    "build-and-deploy",
    `DEPLOY_SCRIPT=${process.env.DEPLOY_SCRIPT}`,
    `RPC_URL=${process.env.RPC_URL}`,
  ],
  {
    stdio: "inherit",
    shell: true,
  }
);

process.exit(result.status);
