import { describe, expect, it } from "vitest";
import {
  decryptMediaBlob,
  decryptMessageEnvelope,
  decryptTextFromDevice,
  encryptMediaFile,
  encryptMessageEnvelope,
  encryptTextForDevice,
  type DeviceIdentity,
  type DeviceKey,
  type EncryptedPayload,
} from "../../App";

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

function deviceKeyFromIdentity(identity: DeviceIdentity, revokedAt: string | null = null): DeviceKey {
  return {
    id: identity.deviceId,
    memberId: identity.memberId,
    deviceLabel: "teste",
    publicKey: identity.publicJwk,
    createdAt: identity.createdAt,
    lastSeenAt: "2026-06-18T10:00:00.000Z",
    revokedAt,
  };
}

function flipBase64Character(value: string) {
  const replacement = value.endsWith("A") ? "B" : "A";
  return `${value.slice(0, -1)}${replacement}`;
}

describe("crypto characterization", () => {
  it("round-trips text encrypted for a device", async () => {
    const alice = await makeDevice("device_alice", "member_alice");
    const bob = await makeDevice("device_bob", "member_bob");

    const payload = await encryptTextForDevice("olá Porto NM", alice.privateKey, bob.publicJwk);
    const plainText = await decryptTextFromDevice(payload, bob.privateKey, alice.publicJwk);

    expect(plainText).toBe("olá Porto NM");
  });

  it("creates one message envelope per non-revoked recipient device", async () => {
    const alice = await makeDevice("device_alice", "member_alice");
    const bob = await makeDevice("device_bob", "member_bob");
    const carolina = await makeDevice("device_carolina", "member_carolina");
    const revoked = await makeDevice("device_revoked", "member_revoked");
    const outsider = await makeDevice("device_outsider", "member_outsider");

    const recipientKeys = [
      deviceKeyFromIdentity(bob),
      deviceKeyFromIdentity(carolina),
      deviceKeyFromIdentity(revoked, "2026-06-18T09:00:00.000Z"),
    ];
    const envelope = await encryptMessageEnvelope(
      { body: "mensagem privada", citationCode: null },
      alice,
      recipientKeys,
    );

    expect(Object.keys(envelope)).toEqual(["device_bob", "device_carolina"]);

    const senderAndRecipientKeys = [deviceKeyFromIdentity(alice), ...recipientKeys];
    await expect(
      decryptMessageEnvelope(envelope, alice.deviceId, bob, senderAndRecipientKeys),
    ).resolves.toMatchObject({ body: "mensagem privada", citationCode: null, image: null });
    await expect(
      decryptMessageEnvelope(envelope, alice.deviceId, outsider, senderAndRecipientKeys),
    ).resolves.toBeNull();
  });

  it("round-trips encrypted media bytes and preserves metadata", async () => {
    const sourceBytes = new Uint8Array([1, 2, 3, 4, 128, 255]);
    const file = new File([sourceBytes], "foto.png", { type: "image/png" });

    const encrypted = await encryptMediaFile(file);
    const decrypted = await decryptMediaBlob(encrypted.blob, encrypted.metadata);

    expect(encrypted.metadata.mimeType).toBe("image/png");
    expect(encrypted.metadata.name).toBe("foto.png");
    expect(new Uint8Array(await decrypted.arrayBuffer())).toEqual(sourceBytes);
  });

  it("rejects tampered ciphertext and wrong IVs", async () => {
    const alice = await makeDevice("device_alice", "member_alice");
    const bob = await makeDevice("device_bob", "member_bob");
    const payload = await encryptTextForDevice("não mexer", alice.privateKey, bob.publicJwk);
    const tamperedCiphertext: EncryptedPayload = {
      ...payload,
      ciphertext: flipBase64Character(payload.ciphertext),
    };
    const wrongIv: EncryptedPayload = {
      ...payload,
      iv: "AAAAAAAAAAAAAAAA",
    };

    await expect(decryptTextFromDevice(tamperedCiphertext, bob.privateKey, alice.publicJwk)).rejects.toThrow();
    await expect(decryptTextFromDevice(wrongIv, bob.privateKey, alice.publicJwk)).rejects.toThrow();
  });
});
