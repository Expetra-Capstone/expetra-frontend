import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

type PermissionStatus =
  | "granted"
  | "denied"
  | "never_ask_again"
  | "checking"
  | "unavailable";

export function useSmsPermission() {
  const [status, setStatus] = useState<PermissionStatus>(
    Platform.OS !== "android" ? "unavailable" : "checking",
  );

  useEffect(() => {
    if (Platform.OS === "android") checkPermission();
  }, []);

  async function checkPermission() {
    try {
      const already = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      setStatus(already ? "granted" : "denied");
    } catch {
      setStatus("denied");
    }
  }

  async function requestPermission(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: "SMS Access Required",
          message:
            "Allow access to read bank SMS messages for automatic expense tracking.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        },
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        setStatus("granted");
        return true;
      }
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        setStatus("never_ask_again");
      } else {
        setStatus("denied");
      }
      return false;
    } catch {
      setStatus("denied");
      return false;
    }
  }

  return {
    status,
    isGranted: status === "granted",
    isChecking: status === "checking",
    requestPermission,
  };
}
