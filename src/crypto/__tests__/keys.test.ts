import { beforeEach, describe, expect, it, vi } from "vitest";
import { decryptTextFromDevice, encryptTextForDevice } from "../../App";
import {
  annotateDeviceKeysWithTrust,
  canUseDeviceKeyForEncryption,
  ensureDeviceIdentity,
  trustDeviceKey,
  type DeviceIdentity,
  type DeviceKey,
  type LegacyStoredDeviceIdentity,
} from "../keys";

const legacyPrefix = "porto_nm_device_identity";

beforeEach(() => {
  localStorage.clear();
});

async function makeDevice(deviceId: string, memberId: string): Promise<DeviceIdentity> {
  const pair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  return {
    deviceId,
    memberId,
    publicJwk,
    publicKey: pair.publicKey,
    privateKey: pair.privateKey,
    createdAt: "2026-06-18T10:00:00.000Z",
    storageMode: "indexeddb",
  };
}

function deviceKeyFromIdentity(identity: DeviceIdentity): DeviceKey {
  return {
    id: identity.deviceId,
    memberId: identity.memberId,
    deviceLabel: "teste",
    publicKey: identity.publicJwk,
    createdAt: identity.createdAt,
    lastSeenAt: "2026-06-18T10:00:00.000Z",
    revokedAt: null,
  };
}

function makeClient() {
  const upsert = vi.fn(async () => ({ error: null }));
  return {
    from: vi.fn(() => ({ upsert })),
    upsert,
  };
}

describe("device key storage", () => {
  it("migrates a legacy localStorage identity into non-extractable IndexedDB keys", async () => {
    const memberId = `member_${crypto.randomUUID()}`;
    const peer = await makeDevice(`peer_${crypto.randomUUID()}`, "member_peer");
    const legacyPair = await crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey"],
    );
    const legacyPublicJwk = await crypto.subtle.exportKey("jwk", legacyPair.publicKey);
    const legacyPrivateJwk = await crypto.subtle.exportKey("jwk", legacyPair.privateKey);
    const legacy: LegacyStoredDeviceIdentity = {
      deviceId: `device_${crypto.randomUUID()}`,
      memberId,
      publicJwk: legacyPublicJwk,
      privateJwk: legacyPrivateJwk,
      createdAt: "2026-06-18T10:00:00.000Z",
    };
    const storageKey = `${legacyPrefix}:${memberId}`;
    localStorage.setItem(storageKey, JSON.stringify(legacy));
    const encryptedBeforeMigration = await encryptTextForDevice(
      "mensagem antiga",
      peer.privateKey,
      legacyPublicJwk,
    );

    const identity = await ensureDeviceIdentity(makeClient() as never, memberId);

    expect(identity.storageMode).toBe("indexeddb");
    expect(localStorage.getItem(storageKey)).toBeNull();
    await expect(crypto.subtle.exportKey("jwk", identity.privateKey)).rejects.toThrow();
    await expect(
      decryptTextFromDevice(encryptedBeforeMigration, identity.privateKey, peer.publicJwk),
    ).resolves.toBe("mensagem antiga");
  });
});

describe("trust on first use", () => {
  it("pins first-seen keys, detects changed keys, and allows explicit re-trust", async () => {
    const memberId = `member_${crypto.randomUUID()}`;
    const firstDevice = await makeDevice(`device_${crypto.randomUUID()}`, memberId);
    const firstKey = deviceKeyFromIdentity(firstDevice);

    const [firstSeen] = await annotateDeviceKeysWithTrust([firstKey], null);
    const [sameKey] = await annotateDeviceKeysWithTrust([firstKey], null);

    expect(firstSeen.trustStatus).toBe("new");
    expect(sameKey.trustStatus).toBe("trusted");
    expect(canUseDeviceKeyForEncryption(sameKey)).toBe(true);

    const changedDevice = await makeDevice(firstDevice.deviceId, memberId);
    const [changedKey] = await annotateDeviceKeysWithTrust([deviceKeyFromIdentity(changedDevice)], null);

    expect(changedKey.trustStatus).toBe("changed");
    expect(canUseDeviceKeyForEncryption(changedKey)).toBe(false);

    await trustDeviceKey(changedKey);
    const [trustedAgain] = await annotateDeviceKeysWithTrust([changedKey], null);

    expect(trustedAgain.trustStatus).toBe("trusted");
    expect(canUseDeviceKeyForEncryption(trustedAgain)).toBe(true);
  });
});
