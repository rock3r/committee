// Only explicitly authored messages are safe to expose. Never return provider bodies or filesystem errors.
export class UserError extends Error {}
