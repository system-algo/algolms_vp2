import { createClient } from "./lib/supabaseClientBundled.js";

function getCredentials() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const url =
    (typeof window !== "undefined" &&
      (sessionStorage.getItem("lms_supabase_url") ||
        localStorage.getItem("lms_supabase_url") ||
        params?.get("supabaseUrl"))) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    "https://example.supabase.co";

  const key =
    (typeof window !== "undefined" &&
      (sessionStorage.getItem("lms_supabase_key") ||
        localStorage.getItem("lms_supabase_key") ||
        params?.get("supabaseKey"))) ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    "dummy-anon-key";

  return { url, key };
}

const { url, key } = getCredentials();

const authStorage =
  typeof window !== "undefined" ? window.sessionStorage : undefined;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "algo-learning-auth-session",
    ...(authStorage ? { storage: authStorage } : {}),
  },
});

if (typeof window !== "undefined") {
  const token =
    sessionStorage.getItem("lms_access_token") ||
    localStorage.getItem("lms_access_token");
  if (token && token.split(".").length === 3) {
    try {
      supabase.auth
        .setSession({ access_token: token, refresh_token: "" })
        .catch(() => {});
    } catch {}
  }
}

const TEST_ACCOUNT_UUIDS = {
  "ptsy1.test.stu@algo.edu.vn": "10000000-0000-0000-0000-000000000001",
  "ptsy1.test.tch@algo.edu.vn": "10000000-0000-0000-0000-000000000002",
  "ptpy1.test.stu@algo.edu.vn": "10000000-0000-0000-0000-000000000003",
  "ptpy1.test.tch@algo.edu.vn": "10000000-0000-0000-0000-000000000004",
  "ugd.test.stu@algo.edu.vn": "10000000-0000-0000-0000-000000000005",
  "ugd.test.tch@algo.edu.vn": "10000000-0000-0000-0000-000000000006",
};

function toDeterministicUuid(str) {
  if (!str) return "00000000-0000-0000-0000-000000000099";
  const clean = String(str).trim().toLowerCase();
  if (TEST_ACCOUNT_UUIDS[clean]) return TEST_ACCOUNT_UUIDS[clean];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return clean;
  }
  let hash1 = 0x811c9dc5;
  let hash2 = 0x4f1bbcd1;
  let hash3 = 0x2e35a1a9;
  let hash4 = 0x9e3779b9;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 0x01000193) >>> 0;
    hash2 = Math.imul(hash2 ^ ch, 0x050c5d1f) >>> 0;
    hash3 = Math.imul(hash3 ^ ch, 0x0711b7d5) >>> 0;
    hash4 = Math.imul(hash4 ^ ch, 0x091b3b29) >>> 0;
  }
  const hex = (
    hash1.toString(16).padStart(8, "0") +
    hash2.toString(16).padStart(8, "0") +
    hash3.toString(16).padStart(8, "0") +
    hash4.toString(16).padStart(8, "0")
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Fallback user resolution when running inside LMS replica
const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
supabase.auth.getUser = async (jwt) => {
  try {
    const res = await originalGetUser(jwt);
    if (res?.data?.user?.email) return res;
  } catch {}

  const email =
    typeof window !== "undefined"
      ? (
          sessionStorage.getItem("lms_student_email") ||
          localStorage.getItem("lms_student_email") ||
          sessionStorage.getItem("lms_user_email") ||
          localStorage.getItem("lms_user_email") ||
          ""
        )
          .trim()
          .toLowerCase()
      : "";

  if (email) {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, email, name, username, role")
        .eq("email", email)
        .maybeSingle();

      if (profile && profile.id) {
        return {
          data: {
            user: {
              id: profile.id,
              email: profile.email || email,
              user_metadata: {
                full_name: profile.name,
                username: profile.username,
                role: profile.role || (email.includes(".tch") || email.includes("teacher") ? "teacher" : "student"),
              },
            },
          },
          error: null,
        };
      }
    } catch (e) {
      console.warn("Fallback getUser error:", e);
    }

    const resolvedId = TEST_ACCOUNT_UUIDS[email] || toDeterministicUuid(email);
    const role = email.includes(".tch") || email.includes("teacher") ? "teacher" : "student";

    return {
      data: {
        user: {
          id: resolvedId,
          email,
          user_metadata: {
            username: email.replace(/@algo\.edu\.vn$/i, ""),
            full_name: email.replace(/@algo\.edu\.vn$/i, ""),
            role,
          },
        },
      },
      error: null,
    };
  }

  return { data: { user: null }, error: null };
};

export default supabase;
