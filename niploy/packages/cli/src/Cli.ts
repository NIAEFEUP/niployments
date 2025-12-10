import { Command } from "@effect/cli";
import { Effect } from "effect";

const command = Command.make("niploy").pipe(
  Command.withDescription("The CLI for niployments"),
  Command.withHandler(() => {
    return Effect.gen(function* () {
      yield* Effect.logInfo("Nothing implemented yet...");
    });
  }),
);

export const cli = Command.run(command, {
  name: "niploy",
  version: "0.0.0",
});
