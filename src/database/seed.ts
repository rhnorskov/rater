import fs from "node:fs";
import path from "node:path";

import { program } from "commander";
import inquirer from "inquirer";

program
  .name("seed")
  .version("1.0.0")
  .action(async () => {
    // Step 1: Read all entries in the current directory
    const entries = fs.readdirSync(__dirname);

    // Step 2: Filter for directories
    const directories = entries.filter((entry) => {
      const fullPath = path.join(__dirname, entry);
      return fs.statSync(fullPath).isDirectory();
    });

    // Step 3: Check for 'seed.ts' in each directory
    const seeds = directories.filter((dir) => {
      const seedFilePath = path.join(__dirname, dir, "seed.ts");
      return fs.existsSync(seedFilePath);
    });

    // Step 4: Use the collected directory names as choices in Inquirer prompt
    const { selectedSeeds } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedSeeds",
        message: "Select seeds",
        choices: seeds.map((seed) => ({
          name: seed,
          value: seed,
          checked: true,
        })),
      },
    ]);

    // Step 5: Execute the 'down' and 'up' functions from each selected seed
    for (const seed of selectedSeeds) {
      const { down } = await import(path.join(__dirname, seed, "seed.ts"));
      console.log("Tearing down", seed);
      await down();
    }

    for (const seed of selectedSeeds) {
      const { up } = await import(path.join(__dirname, seed, "seed.ts"));
      console.log("Seeding", seed);
      await up();
    }

    process.exit(0);
  });

program.parse(process.argv);
