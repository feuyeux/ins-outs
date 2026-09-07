export default function assert(
  value: unknown,
  message = "Invalid game state",
): asserts value {
  if (!value) throw new Error(message);
}
