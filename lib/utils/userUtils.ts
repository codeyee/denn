import { User } from "@/lib/api/types";

export function formatUserDisplayName(user: User): string {
    const hasFirstName = user.first_name && user.first_name.trim() !== "";
    const hasLastName = user.last_name && user.last_name.trim() !== "";

    if (hasFirstName || hasLastName) {
        const parts = [];
        if (hasFirstName) parts.push(user.first_name);
        if (hasLastName) parts.push(user.last_name);
        return parts.join(" ");
    }

    if (user.username) {
        return user.username.startsWith("@")
            ? user.username.slice(1)
            : user.username;
    }

    return user.email;
}

export function formatUserDisplayNameWithUsername(user: User): {
    displayName: string;
    username?: string;
} {
    const hasFirstName = user.first_name && user.first_name.trim() !== "";
    const hasLastName = user.last_name && user.last_name.trim() !== "";

    if (hasFirstName || hasLastName) {
        const parts = [];
        if (hasFirstName) parts.push(user.first_name);
        if (hasLastName) parts.push(user.last_name);
        const displayName = parts.join(" ");

        if (user.username) {
            const username = user.username.startsWith("@")
                ? user.username.slice(1)
                : user.username;
            return { displayName, username };
        }

        return { displayName };
    }

    const username = user.username
        ? user.username.startsWith("@")
            ? user.username.slice(1)
            : user.username
        : user.email;

    return { displayName: username };
}
