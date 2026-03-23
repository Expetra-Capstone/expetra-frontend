// services/smsSync.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTransaction } from "./apiService";
import { isBankSms, parseSms, RawSms } from "./smsParser";

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const UPLOADED_IDS_KEY = "sms_uploaded_ids_v1";
const INITIAL_SYNC_DONE_KEY = "sms_initial_sync_done_v1";
const FORCE_SYNC_DONE_KEY = "sms_force_sync_done_v1";

// ─── Persistence helpers ──────────────────────────────────────────────────────

export async function getUploadedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(UPLOADED_IDS_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

async function persistUploadedIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(UPLOADED_IDS_KEY, JSON.stringify([...ids]));
}

export async function markUploaded(smsId: string): Promise<void> {
  const ids = await getUploadedIds();
  ids.add(smsId);
  await persistUploadedIds(ids);
}

export async function isInitialSyncDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(INITIAL_SYNC_DONE_KEY);
  return val === "true";
}

async function setInitialSyncDone(): Promise<void> {
  await AsyncStorage.setItem(INITIAL_SYNC_DONE_KEY, "true");
}

// ─── Force-sync done flag ─────────────────────────────────────────────────────
// Once the user triggers the manual "Extract All" the result is persisted so
// the button is permanently disabled across app restarts.

export async function isForceSyncDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(FORCE_SYNC_DONE_KEY);
  return val === "true";
}

async function setForceSyncDone(): Promise<void> {
  await AsyncStorage.setItem(FORCE_SYNC_DONE_KEY, "true");
}

// ─── Upload one SMS ───────────────────────────────────────────────────────────

async function uploadOne(token: string, sms: RawSms): Promise<boolean> {
  if (!isBankSms(sms.address, sms.body)) return false;
  const parsed = parseSms(sms);
  if (!parsed) return false;
  const result = await createTransaction(token, parsed.payload);
  return !result.error;
}

// ─── Progress callback type ───────────────────────────────────────────────────

export interface SyncProgress {
  processed: number;
  total: number;
  success: number;
  failed: number;
}

// ─── Normal incremental sync ──────────────────────────────────────────────────
// Skips already-uploaded IDs. Safe to re-run on every screen focus.

export async function runInitialSync(
  token: string,
  allMessages: RawSms[],
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncProgress> {
  const uploadedIds = await getUploadedIds();

  const pending = allMessages.filter(
    (sms) => !uploadedIds.has(sms._id) && isBankSms(sms.address, sms.body),
  );

  const total = pending.length;
  let processed = 0;
  let success = 0;
  let failed = 0;
  const BATCH = 5;

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map(async (sms) => {
        const ok = await uploadOne(token, sms);
        return { id: sms._id, ok };
      }),
    );

    const justUploaded = results.filter((r) => r.ok).map((r) => r.id);
    if (justUploaded.length > 0) {
      justUploaded.forEach((id) => uploadedIds.add(id));
      await persistUploadedIds(uploadedIds);
    }

    success += justUploaded.length;
    failed += results.filter((r) => !r.ok).length;
    processed += batch.length;
    onProgress?.({ processed, total, success, failed });

    if (i + BATCH < pending.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  await setInitialSyncDone();
  return { processed, total, success, failed };
}

// ─── Force full sync ──────────────────────────────────────────────────────────
// Uploads EVERY bank SMS in allMessages regardless of whether it has been
// uploaded before. Intended as a one-time manual action — once it completes
// successfully the FORCE_SYNC_DONE_KEY is set so the caller can permanently
// disable the trigger button.

export async function forceFullSync(
  token: string,
  allMessages: RawSms[],
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncProgress> {
  const bankMessages = allMessages.filter((sms) =>
    isBankSms(sms.address, sms.body),
  );

  const total = bankMessages.length;
  let processed = 0;
  let success = 0;
  let failed = 0;
  const BATCH = 5;

  // We still update the uploaded-ids set so the normal incremental sync
  // doesn't re-upload anything that succeeded here.
  const uploadedIds = await getUploadedIds();

  for (let i = 0; i < bankMessages.length; i += BATCH) {
    const batch = bankMessages.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map(async (sms) => {
        const ok = await uploadOne(token, sms);
        return { id: sms._id, ok };
      }),
    );

    const justUploaded = results.filter((r) => r.ok).map((r) => r.id);
    if (justUploaded.length > 0) {
      justUploaded.forEach((id) => uploadedIds.add(id));
      await persistUploadedIds(uploadedIds);
    }

    success += justUploaded.length;
    failed += results.filter((r) => !r.ok).length;
    processed += batch.length;
    onProgress?.({ processed, total, success, failed });

    if (i + BATCH < bankMessages.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Mark done regardless of partial failures so the button is always disabled
  // after one attempt — prevents the user from accidentally spamming the API.
  await setForceSyncDone();
  return { processed, total, success, failed };
}

// ─── Real-time listener ───────────────────────────────────────────────────────

interface IncomingSms {
  originatingAddress: string;
  body: string;
  timestamp: number;
}
interface SmsSubscription {
  remove(): void;
}
interface SmsListenerModule {
  addListener(cb: (msg: IncomingSms) => void): SmsSubscription;
}

export function startSmsListener(
  token: string,
  onNewTransaction: (smsId: string) => void,
): () => void {
   
  const SmsListener = require("react-native-android-sms-listener")
    .default as SmsListenerModule;

  const subscription = SmsListener.addListener(async (msg: IncomingSms) => {
    if (!isBankSms(msg.originatingAddress, msg.body)) return;

    const syntheticId = `live_${msg.originatingAddress}_${msg.timestamp}`;
    const uploadedIds = await getUploadedIds();
    if (uploadedIds.has(syntheticId)) return;

    const rawSms: RawSms = {
      _id: syntheticId,
      address: msg.originatingAddress,
      body: msg.body,
      date: String(msg.timestamp),
      date_sent: String(msg.timestamp),
      read: "0",
      type: "1",
    };

    const ok = await uploadOne(token, rawSms);
    if (ok) {
      await markUploaded(syntheticId);
      onNewTransaction(syntheticId);
    }
  });

  return () => subscription.remove();
}
