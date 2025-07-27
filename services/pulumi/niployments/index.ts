// ementas is an example pulumi service
// import "./services/ementas/index.js";
import "./services/tts/index.js";
import "./services/websiteae/index.js";
import "./resources/nfs-provisioner/charts.js";
import "./resources/keel/charts.js";

import { CommitSignal } from "./utils/pending.js";
CommitSignal.globalParent.resolve();
