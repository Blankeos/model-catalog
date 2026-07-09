import type { ModelInput, ProviderInput, RuntimeCatalogGenerator } from "../types.js"

export const OLLAMA_PROVIDER_ID = "ollama"
export const OLLAMA_PROVIDER_NAME = "Ollama (Local)"
export const OLLAMA_BASE_URL = "http://localhost:11434/v1"
export const OLLAMA_NPM_PACKAGE = "@ai-sdk/openai-compatible"
export const OLLAMA_CLI_ARGS = ["ls"] as const

const DEFAULT_OLLAMA_TIMEOUT_MS = 5_000

export type OllamaCliModel = {
  id: string
  name: string
}

export type OllamaCliGeneratorOptions = {
  command?: string
  timeoutMs?: number
}

/**
 * Runtime CLI generator for local Ollama models.
 *
 * This runs `ollama ls`, so it can only be used in Node.js on machines where
 * the Ollama CLI is installed. Do not use it in browser bundles; browsers cannot
 * execute local CLIs.
 */
export function ollamaCliGenerator(options: OllamaCliGeneratorOptions = {}): RuntimeCatalogGenerator {
  return {
    id: OLLAMA_PROVIDER_ID,
    name: OLLAMA_PROVIDER_NAME,
    kind: "runtime",
    async generate(ctx) {
      const models = await listOllamaModelsFromCli(options)
      ctx.addProvider(ollamaProviderFromModels(models))
    },
  }
}

export function ollamaProviderFromModels(models: OllamaCliModel[]): ProviderInput {
  return {
    id: OLLAMA_PROVIDER_ID,
    name: OLLAMA_PROVIDER_NAME,
    api: OLLAMA_BASE_URL,
    doc: "https://ollama.com",
    npm: OLLAMA_NPM_PACKAGE,
    metadata: {
      generatorType: "runtime-cli",
      runtimeOnly: true,
      command: "ollama ls",
    },
    models: models.map(ollamaModelInput),
  }
}

export async function listOllamaModelsFromCli(options: OllamaCliGeneratorOptions = {}): Promise<OllamaCliModel[]> {
  const command = options.command ?? "ollama"
  const timeoutMs = options.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS

  const runtimeProcess = (globalThis as unknown as { process?: { versions?: { node?: string } } }).process
  if (!runtimeProcess?.versions?.node) {
    throw new Error("ollamaCliGenerator can only run in Node.js on a machine with the Ollama CLI installed; it cannot run in browsers.")
  }

  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ execFile: Function }>
  const { execFile } = await dynamicImport("node:child_process")

  return new Promise((resolve, reject) => {
    const child = execFile(command, [...OLLAMA_CLI_ARGS], { timeout: timeoutMs }, (error: Error | null, stdout: { toString(): string }, stderr: { toString(): string }) => {
      if (error) {
        const message = stderr.toString().trim() || error.message
        reject(new Error(`Failed to run \`${command} ls\`: ${message}`))
        return
      }
      resolve(parseOllamaLsOutput(stdout.toString()))
    })

    ;(child as { on(event: "error", listener: (error: Error) => void): void }).on("error", (error) => {
      reject(new Error(`Failed to run \`${command} ls\`: ${error.message}`))
    })
  })
}

export function parseOllamaLsOutput(output: string): OllamaCliModel[] {
  const seen = new Set<string>()
  const models: OllamaCliModel[] = []

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const name = line.split(/\s+/)[0]
    if (!name || name.toLowerCase() === "name" || seen.has(name)) continue

    seen.add(name)
    models.push({ id: name, name })
  }

  return models.sort((a, b) => a.name.localeCompare(b.name))
}

function ollamaModelInput(model: OllamaCliModel): ModelInput {
  return {
    id: model.id,
    name: model.name,
    family: modelFamily(model.id),
    capabilities: ["open_weights", "temperature", "tool_call"],
    modalities: { input: ["text"], output: ["text"] },
  }
}

function modelFamily(modelId: string): string {
  return modelId.split(/[:/]/)[0]?.trim() || modelId
}
