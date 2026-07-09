export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function matchesQuery(values: Array<string | undefined | null>, query: string): boolean {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return true
  const haystack = values.filter(Boolean).join(" ").toLowerCase()
  return tokens.every((token) => haystack.includes(token))
}

export function capabilitySearchTerms(capabilities: readonly string[]): string[] {
  return capabilities.flatMap((capability) => {
    const spaced = capability.replace(/_/g, " ")
    switch (capability) {
      case "tool_call":
        return [capability, spaced, "tools", "tool use", "tool calling", "function calling"]
      case "structured_output":
        return [capability, spaced, "json", "schema"]
      case "open_weights":
        return [capability, spaced, "open source", "weights"]
      default:
        return capability === spaced ? [capability] : [capability, spaced]
    }
  })
}
