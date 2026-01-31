import { Command } from "@effect/cli";
import { Effect, Data } from "effect";
import * as ExampleCommand from "#niploy/commands/Example.js";

// const command = Command.make("niploy").pipe(
  Command.withDescription("The CLI for niployments"),
  Command.withHandler(() => {
    return Effect.gen(function* () {
      yield* Effect.logInfo("Nothing implemented yet...");
      
      // yield* ExampleCommand.run;
    });
  }),
);

/*export const cli = Command.run(command, {
  name: "niploy",
  version: "0.0.0",
});*/

export const cli = (argv: string[]) => ExampleCommand.run;
