import "./services/ementas/index.js";
import "./resources/minio/tenant.js";

import { CommitSignal } from "./utils/pending.js";

CommitSignal.globalParent.resolve();
