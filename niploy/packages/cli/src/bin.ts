#!/usr/bin/env node
import { Effect, Layer, Logger, LogLevel } from "effect";
import { CliConfig } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { cli } from "#niploy/Cli";

const MainLive = Layer.mergeAll(
  Logger.minimumLogLevel(LogLevel.Debug),
  CliConfig.layer({ showBuiltIns: false }),
  NodeContext.layer,
);

cli(process.argv).pipe(
  Effect.orDie,
  Effect.provide(MainLive),
  NodeRuntime.runMain({
    disablePrettyLogger: false,
    disableErrorReporting: false,
  }),
);
