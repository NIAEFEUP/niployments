import { adoptInventory, features } from "#config";
import { adoptFromInventory } from "#utils/adopt.js";
import { finalize } from "#utils/finalize.js";

// Platform
import { certManager } from "#platform/cert-manager.js";
import { traefik } from "#platform/traefik.js";
import { replicator } from "#platform/replicator.js";
import { keel } from "#platform/keel.js";
import { cilium } from "#platform/cilium.js";
import { longhorn } from "#platform/longhorn.js";
import { storage } from "#platform/storage.js";
import { nfsProvisioner } from "#platform/nfs-provisioner.js";
import { externalDns } from "#platform/external-dns.js";
import { imageRegistry } from "#platform/harbor.js";
import { monitoring } from "#platform/monitoring.js";

// Databases
import { mongodbApps } from "#databases/mongodb/index.js";
import { postgres } from "#databases/postgres/index.js";
import { valkey } from "#databases/valkey.js";
import { pgadmin } from "#databases/pgadmin.js";

// Apps
import { aefeup } from "#apps/aefeup.js";
import { niWebsite } from "#apps/ni-website.js";
import { nitsig } from "#apps/nitsig.js";
import { inicio, inicioStaging } from "#apps/inicio.js";
import { tts, ttsStaging } from "#apps/tts.js";
import { ementas } from "#apps/ementas.js";
import { plausible } from "#apps/plausible.js";
import { teup } from "#apps/teup.js";
import { nextcloud } from "#apps/nextcloud.js";
import { minicraft } from "#apps/minicraft.js";

// Development helpers
import { testApp } from "#dev/test-app.js";
import { game2048 } from "#dev/game-2048.js";
import { podinfo } from "#dev/podinfo.js";

adoptFromInventory(adoptInventory);

// Every stack deploys the ingress and the certificates
certManager();
traefik();

const enabled: [keyof typeof features, () => unknown][] = [
  ["replicator", replicator],
  ["keel", keel],
  ["cilium", cilium],
  ["longhorn", longhorn],
  ["nfsProvisioner", nfsProvisioner],
  ["externalDns", externalDns],
  ["harbor", imageRegistry],
  ["monitoring", monitoring],

  ["mongodb", mongodbApps],
  ["postgres", postgres],
  ["valkey", valkey],
  ["pgadmin", pgadmin],

  ["aefeup", aefeup],
  ["niWebsite", niWebsite],
  ["nitsig", nitsig],
  ["inicio", inicio],
  ["inicioStaging", inicioStaging],
  ["tts", tts],
  ["ttsStaging", ttsStaging],
  ["ementas", ementas],
  ["plausible", plausible],
  ["teup", teup],
  ["nextcloud", nextcloud],
  ["minicraft", minicraft],

  ["testApp", testApp],
  ["game2048", game2048],
  ["podinfo", podinfo],
];

// Development stacks without Longhorn get local-path StorageClasses of the same names
storage();

for (const [feature, deploy] of enabled) {
  if (features[feature]) deploy();
}

finalize();
