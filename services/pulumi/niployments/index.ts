// ementas is an example pulumi service
// import "./services/ementas/index.js";

import { CommitSignal } from "./utils/pending.js";
CommitSignal.globalParent.resolve();
