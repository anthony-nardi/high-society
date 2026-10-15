/** Bots are stored as "Bot #n"; humans as their email address. */
export function isBotName(email: string) {
  return /^Bot #\d+$/.test(email);
}

/** Short name for the table: "Bot 2" or the part of the email before the @. */
export default function displayName(email: string) {
  if (isBotName(email)) {
    return email.replace("#", "");
  }
  return email.split("@")[0];
}
