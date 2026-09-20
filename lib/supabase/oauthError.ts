interface OAuthErrorMessageParams {
  error?: string | null;
  errorCode?: string | null;
  reason?: string | null;
}

export function getOAuthErrorMessage({ error, errorCode, reason }: OAuthErrorMessageParams) {
  if (error === "provider") return "Use a Google account to continue.";

  const code = reason ?? errorCode;
  if (code === "bad_oauth_state") {
    return "This Google sign-in attempt expired or was already used. Start again.";
  }

  if (error === "oauth" || error === "invalid_request") {
    return "Google sign-in could not be completed. Please try again.";
  }

  return undefined;
}
