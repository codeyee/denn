import { User } from "@/lib/api/types";

function hasName(user: User): boolean {
  const hasFirstName = Boolean(user.first_name?.trim());
  const hasLastName = Boolean(user.last_name?.trim());
  return hasFirstName || hasLastName;
}

function formatName(user: User): string {
  const parts: string[] = [];
  if (user.first_name?.trim()) parts.push(user.first_name);
  if (user.last_name?.trim()) parts.push(user.last_name);
  return parts.join(" ");
}

function formatUsername(username: string): string {
  return username.startsWith("@") ? username.slice(1) : username;
}

export function formatUserDisplayName(user: User): string {
  if (hasName(user)) return formatName(user);
  if (user.username) return formatUsername(user.username);
  return user.email;
}

export function formatUserDisplayNameWithUsername(user: User): {
  displayName: string;
  username?: string;
} {
  if (hasName(user)) {
    const displayName = formatName(user);
    if (user.username) {
      return { displayName, username: formatUsername(user.username) };
    }
    return { displayName };
  }

  const username = user.username ? formatUsername(user.username) : user.email;
  return { displayName: username };
}
