import type { SupabaseClient } from "@supabase/supabase-js";

const cryptoDbName = "porto-nm";
const cryptoDbVersion = 1;
const identityStoreName = "device-identity";
const pinnedKeysStoreName = "pinned-keys";
const deviceStorePrefix = "porto_nm_device_identity";

export type DeviceTrustStatus = "own" | "trusted" | "new" | "changed" | "unknown";

export type DeviceKey = {
  id: string;
  memberId: string;
  deviceLabel: string;
  publicKey: JsonWebKey;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  fingerprint?: string;
  trustStatus?: DeviceTrustStatus;
};

export type LegacyStoredDeviceIdentity = {
  deviceId: string;
  memberId: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  createdAt: string;
};

export type DeviceIdentity = {
  deviceId: string;
  memberId: string;
  publicJwk: JsonWebKey;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  createdAt: string;
  storageMode: "indexeddb" | "legacy-localstorage";
};

type IndexedDbDeviceIdentity = Omit<DeviceIdentity, "storageMode">;
type CreatedDeviceIdentity = IndexedDbDeviceIdentity & { storageMode: DeviceIdentity["storageMode"] };

type PinnedDeviceKey = {
  id: string;
  memberId: string;
  deviceId: string;
  fingerprint: string;
  publicJwk: JsonWebKey;
  firstSeenAt: string;
  trustedAt: string;
};

export async function importPublicDeviceKey(jwk: JsonWebKey) {
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    [],
  );
}

export async function importPrivateDeviceKey(jwk: JsonWebKey) {
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    ["deriveKey"],
  );
}

export async function deriveDeviceAesKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  return window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function ensureDeviceIdentity(client: SupabaseClient, memberId: string): Promise<DeviceIdentity> {
  const indexedDbIdentity = await readDeviceIdentity(memberId);
  if (indexedDbIdentity) {
    await publishDeviceKey(client, indexedDbIdentity);
    return { ...indexedDbIdentity, storageMode: "indexeddb" };
  }

  const migratedIdentity = await migrateLegacyIdentity(memberId);
  if (migratedIdentity) {
    await publishDeviceKey(client, migratedIdentity);
    return { ...migratedIdentity, storageMode: "indexeddb" };
  }

  const createdIdentity = await createDeviceIdentity(memberId);
  await publishDeviceKey(client, createdIdentity);
  return createdIdentity;
}

export async function annotateDeviceKeysWithTrust(
  deviceKeys: DeviceKey[],
  ownIdentity: DeviceIdentity | null,
): Promise<DeviceKey[]> {
  return Promise.all(
    deviceKeys.map(async (deviceKey) => {
      const fingerprint = await fingerprintPublicKey(deviceKey.publicKey);
      if (ownIdentity?.deviceId === deviceKey.id) {
        await pinDeviceKey({ ...deviceKey, fingerprint });
        return { ...deviceKey, fingerprint, trustStatus: "own" };
      }

      const pinned = await readPinnedDeviceKey(deviceKey.memberId, deviceKey.id);
      if (!pinned) {
        await pinDeviceKey({ ...deviceKey, fingerprint });
        return { ...deviceKey, fingerprint, trustStatus: "new" };
      }

      return {
        ...deviceKey,
        fingerprint,
        trustStatus: pinned.fingerprint === fingerprint ? "trusted" : "changed",
      };
    }),
  );
}

export async function trustDeviceKey(deviceKey: DeviceKey) {
  const fingerprint = deviceKey.fingerprint ?? (await fingerprintPublicKey(deviceKey.publicKey));
  await pinDeviceKey({ ...deviceKey, fingerprint });
}

export function canUseDeviceKeyForEncryption(deviceKey: DeviceKey) {
  return !deviceKey.revokedAt && deviceKey.trustStatus !== "changed";
}

export async function fingerprintPublicKey(jwk: JsonWebKey) {
  const canonical = canonicalJson({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.match(/.{1,4}/g)?.slice(0, 8).join(" ") ?? hex;
}

export function getBrowserDeviceLabel() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("iphone") || userAgent.includes("android")) return "telemóvel";
  if (userAgent.includes("ipad") || userAgent.includes("tablet")) return "tablet";
  if (userAgent.includes("mac") || userAgent.includes("windows") || userAgent.includes("linux")) {
    return "computador";
  }
  return "browser";
}

async function createDeviceIdentity(memberId: string): Promise<CreatedDeviceIdentity> {
  try {
    const pair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      false,
      ["deriveKey"],
    );
    const publicJwk = await window.crypto.subtle.exportKey("jwk", pair.publicKey);
    const identity = {
      deviceId: `device_${crypto.randomUUID()}`,
      memberId,
      publicJwk,
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      createdAt: new Date().toISOString(),
    };
    await writeDeviceIdentity(identity);
    return { ...identity, storageMode: "indexeddb" };
  } catch {
    return { ...(await createLegacyLocalStorageIdentity(memberId)), storageMode: "legacy-localstorage" };
  }
}

async function migrateLegacyIdentity(memberId: string): Promise<IndexedDbDeviceIdentity | null> {
  const storageKey = `${deviceStorePrefix}:${memberId}`;
  const storedValue = localStorage.getItem(storageKey);
  if (!storedValue) return null;

  try {
    const legacy = JSON.parse(storedValue) as LegacyStoredDeviceIdentity;
    if (legacy.memberId !== memberId || !legacy.deviceId || !legacy.publicJwk || !legacy.privateJwk) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const identity = {
      deviceId: legacy.deviceId,
      memberId,
      publicJwk: legacy.publicJwk,
      publicKey: await importPublicDeviceKey(legacy.publicJwk),
      privateKey: await importPrivateDeviceKey(legacy.privateJwk),
      createdAt: legacy.createdAt,
    };
    await writeDeviceIdentity(identity);
    localStorage.removeItem(storageKey);
    return identity;
  } catch {
    return readLegacyLocalStorageIdentity(memberId);
  }
}

async function createLegacyLocalStorageIdentity(memberId: string): Promise<IndexedDbDeviceIdentity> {
  const pair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"],
  );
  const publicJwk = await window.crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await window.crypto.subtle.exportKey("jwk", pair.privateKey);
  const legacy: LegacyStoredDeviceIdentity = {
    deviceId: `device_${crypto.randomUUID()}`,
    memberId,
    publicJwk,
    privateJwk,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(`${deviceStorePrefix}:${memberId}`, JSON.stringify(legacy));
  return { ...legacy, publicKey: pair.publicKey, privateKey: pair.privateKey };
}

async function readLegacyLocalStorageIdentity(memberId: string): Promise<IndexedDbDeviceIdentity | null> {
  const storageKey = `${deviceStorePrefix}:${memberId}`;
  const storedValue = localStorage.getItem(storageKey);
  if (!storedValue) return null;

  try {
    const legacy = JSON.parse(storedValue) as LegacyStoredDeviceIdentity;
    if (legacy.memberId !== memberId || !legacy.deviceId || !legacy.publicJwk || !legacy.privateJwk) return null;
    return {
      deviceId: legacy.deviceId,
      memberId,
      publicJwk: legacy.publicJwk,
      publicKey: await importPublicDeviceKey(legacy.publicJwk),
      privateKey: await window.crypto.subtle.importKey(
        "jwk",
        legacy.privateJwk,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey"],
      ),
      createdAt: legacy.createdAt,
    };
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

async function publishDeviceKey(client: SupabaseClient, identity: IndexedDbDeviceIdentity) {
  const { error } = await client.from("device_keys").upsert({
    id: identity.deviceId,
    member_id: identity.memberId,
    device_label: getBrowserDeviceLabel(),
    public_key: identity.publicJwk,
    last_seen_at: new Date().toISOString(),
    revoked_at: null,
  });

  if (error) throw error;
  await pinDeviceKey({
    id: identity.deviceId,
    memberId: identity.memberId,
    deviceLabel: getBrowserDeviceLabel(),
    publicKey: identity.publicJwk,
    createdAt: identity.createdAt,
    lastSeenAt: new Date().toISOString(),
    revokedAt: null,
  });
}

async function readDeviceIdentity(memberId: string): Promise<IndexedDbDeviceIdentity | null> {
  const db = await openCryptoDb();
  if (!db) return null;
  return readFromStore<IndexedDbDeviceIdentity>(db, identityStoreName, memberId);
}

async function writeDeviceIdentity(identity: IndexedDbDeviceIdentity) {
  const db = await openCryptoDb();
  if (!db) throw new Error("IndexedDB unavailable");
  await writeToStore(db, identityStoreName, identity.memberId, identity);
}

async function readPinnedDeviceKey(memberId: string, deviceId: string) {
  const db = await openCryptoDb();
  if (!db) return null;
  return readFromStore<PinnedDeviceKey>(db, pinnedKeysStoreName, getPinnedDeviceKeyId(memberId, deviceId));
}

async function pinDeviceKey(deviceKey: DeviceKey) {
  const db = await openCryptoDb();
  if (!db) return;
  const fingerprint = deviceKey.fingerprint ?? (await fingerprintPublicKey(deviceKey.publicKey));
  const now = new Date().toISOString();
  const existing = await readPinnedDeviceKey(deviceKey.memberId, deviceKey.id);
  const pinned: PinnedDeviceKey = {
    id: getPinnedDeviceKeyId(deviceKey.memberId, deviceKey.id),
    memberId: deviceKey.memberId,
    deviceId: deviceKey.id,
    fingerprint,
    publicJwk: deviceKey.publicKey,
    firstSeenAt: existing?.firstSeenAt ?? now,
    trustedAt: now,
  };
  await writeToStore(db, pinnedKeysStoreName, pinned.id, pinned);
}

function getPinnedDeviceKeyId(memberId: string, deviceId: string) {
  return `${memberId}:${deviceId}`;
}

function openCryptoDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(cryptoDbName, cryptoDbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(identityStoreName)) {
        db.createObjectStore(identityStoreName);
      }
      if (!db.objectStoreNames.contains(pinnedKeysStoreName)) {
        db.createObjectStore(pinnedKeysStoreName);
      }
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

function readFromStore<T>(db: IDBDatabase, storeName: string, key: IDBValidKey) {
  return new Promise<T | null>((resolve) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
  });
}

function writeToStore(db: IDBDatabase, storeName: string, key: IDBValidKey, value: unknown) {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB write failed"));
    request.onsuccess = () => resolve();
  });
}

function canonicalJson(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = value[key];
        return result;
      }, {}),
  );
}
