/**
 * Password login is for local development only.
 * Passcode sign-in is the path colleagues use.
 * Vite sets DEV false in production builds, so the password form is stripped.
 */
export const TEMP_PASSWORD_AUTH = import.meta.env.DEV
