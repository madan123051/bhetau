type AccountCompletion = { onboarding_completed_at?: string | null } | null | undefined;

export function destinationForSignedInUser(account: AccountCompletion) {
  return account?.onboarding_completed_at ? "/discover" : "/setup";
}
