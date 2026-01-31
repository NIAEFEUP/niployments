import { Console, Effect } from "effect";
import React, {useState, useEffect} from 'react';
import {render, Text, useApp} from 'ink';
import { load } from "signal-exit";

load()

function ExampleComponent() {
  const app = useApp();
  
  useEffect(() => {
    setTimeout(() => {
      app.exit()
    }, 5000)
  }, [])
  return <Text>Hello, world!</Text>
}

/*process.on("SIGINT", () => {
  console.log("sigint");
})*/

process.on("afterexit", () => {
  console.log("afterexit");
})
process.on("beforeExit", () => {
  setTimeout(() => {
    console.log("beforeExit")
  }, 1000);
});

process.on("exit", () => {
  console.log("exit");
});

export const run = Effect.gen(function* () {
  yield* Effect.addFinalizer((exit) => Effect.logInfo("Exited!", exit));
  const instance = yield* Effect.sync(() => render(<ExampleComponent />, { exitOnCtrlC: false, patchConsole: true  }));
  
  yield* Effect.logInfo("GG")
  yield* Effect.promise(() => instance.waitUntilExit());
  
}).pipe(Effect.scoped);
