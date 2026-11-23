const configuredBase = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = (configuredBase || window.location.origin).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}) {
  const {
    token,
    headers: suppliedHeaders = {},
    body,
    ...requestOptions
  } = options;

  const headers = new Headers(suppliedHeaders);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...requestOptions,
      headers,
      body:
        body === undefined || isFormData || typeof body === "string"
          ? body
          : JSON.stringify(body),
    }
  );

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new ApiError("The server returned an invalid JSON response.", {
        status: response.status,
      });
    }
  } else {
    const text = await response.text().catch(() => "");
    data = text ? { message: text.slice(0, 300) } : null;
  }

  if (!response.ok || data?.success === false) {
    const message =
      data?.message ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : `Request failed (${response.status}).`);
    throw new ApiError(message, { status: response.status, data });
  }

  return data;
}

export function clearAdminSession() {
  sessionStorage.removeItem("token");
}

export function getAdminToken() {
  return sessionStorage.getItem("token");
}

export function handleAdminAuthError(error, navigate) {
  if (error?.status === 401 || error?.status === 403) {
    clearAdminSession();
    navigate("/dashboard/signin", { replace: true });
    return true;
  }
  return false;
}
