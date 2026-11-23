export const USER_TOKEN_KEY = "newshub_user_token";
export const USER_EMAIL_KEY = "newshub_user_email";

function readSessionValue(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export const getUserSession = () => ({
  token: readSessionValue(USER_TOKEN_KEY),
  email: readSessionValue(USER_EMAIL_KEY),
});

export const clearUserSession = () => {
  try {
    sessionStorage.removeItem(USER_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
};
