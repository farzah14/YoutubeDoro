interface OAuthErrorMessageParams {
  error?: string | null;
  errorCode?: string | null;
  reason?: string | null;
}

export function getOAuthErrorMessage({ error, errorCode, reason }: OAuthErrorMessageParams) {
  if (error === "provider") return "Use a Google account to continue.";

  const code = reason ?? errorCode;
  if (["bad_oauth_state", "flow_state_already_used", "flow_state_expired", "flow_state_not_found"].includes(code ?? "")) {
    return "This Google sign-in attempt expired or was already used. Start again.";
  }

  if (error === "oauth" || error === "invalid_request") {
    return "Google sign-in could not be completed. Please try again.";
  }

  return undefined;
}
