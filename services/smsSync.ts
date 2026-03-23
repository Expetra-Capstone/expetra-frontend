// services/smsSync.ts
//
// Handles two concerns:
// 1. Initial bulk sync  — upload every historical bank SMS that hasn't been
//    sent yet, processing in small batches to keep the API happy.
// 2. Real-time listener — fires whenever a new SMS arrives while the app is
//    open, parses it and uploads it immediately if it's a bank message.
//
// Deduplication is done via AsyncStorage: every successfully uploaded SMS _id
// is persisted so reruns never double-post.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTransaction } from "./apiService";
import { isBankSms, parseSms, RawSms } from "./smsParser";

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const UPLOADED_IDS_KEY = "sms_uploaded_ids_v1";
const INITIAL_SYNC_DONE_KEY = "sms_initial_sync_done_v1";

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

// ─── Upload one SMS ───────────────────────────────────────────────────────────
// Returns true if uploaded successfully, false if it should be skipped or
// failed. Caller decides whether to mark it uploaded.

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

// ─── Initial bulk sync ────────────────────────────────────────────────────────
// Reads the full list of raw SMS from the caller (already fetched from inbox),
// skips any that are already in the uploaded-ids set, then uploads the rest
// in batches of 5 with a small inter-batch delay.
//
// onProgress is called after each batch so the UI can show a live counter.

export async function runInitialSync(
  token: string,
  allMessages: RawSms[],
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncProgress> {
  const uploadedIds = await getUploadedIds();

  // Filter down to only bank SMS we haven't uploaded yet
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

    // Upload batch concurrently
    const results = await Promise.all(
      batch.map(async (sms) => {
        const ok = await uploadOne(token, sms);
        return { id: sms._id, ok };
      }),
    );

    // Persist newly uploaded IDs immediately so a crash mid-run doesn't cause
    // double-posting on the next attempt
    const justUploaded = results.filter((r) => r.ok).map((r) => r.id);
    if (justUploaded.length > 0) {
      justUploaded.forEach((id) => uploadedIds.add(id));
      await persistUploadedIds(uploadedIds);
    }

    success += justUploaded.length;
    failed += results.filter((r) => !r.ok).length;
    processed += batch.length;

    onProgress?.({ processed, total, success, failed });

    // Small breathing room between batches — avoids hammering the API
    if (i + BATCH < pending.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  await setInitialSyncDone();
  return { processed, total, success, failed };
}

// ─── Real-time listener ───────────────────────────────────────────────────────
// Sets up react-native-android-sms-listener to fire on every incoming SMS.
// If it's a bank message it is parsed and posted immediately.
// Returns a cleanup function — call it in useEffect's return to avoid leaks.

// react-native-android-sms-listener doesn't ship TS declarations, so we
// declare the minimal interface here rather than adding a separate .d.ts file.
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
  // Dynamic require so this module is never touched on iOS
   
  const SmsListener = require("react-native-android-sms-listener")
    .default as SmsListenerModule;

  const subscription = SmsListener.addListener(async (msg: IncomingSms) => {
    if (!isBankSms(msg.originatingAddress, msg.body)) return;

    // Build a synthetic id from address + timestamp — listener doesn't give us
    // the real Android _id, but this combo is unique enough for deduplication
    const syntheticId = `live_${msg.originatingAddress}_${msg.timestamp}`;

    const uploadedIds = await getUploadedIds();
    if (uploadedIds.has(syntheticId)) return; // already processed

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
