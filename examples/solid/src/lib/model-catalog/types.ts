export type ChatModelValue = {
  provider: string
  modelId: string
  thinking?: string
}

export type ProviderConfig = {
  id: string
  provider: string
  providerId: string | null
  hasApiKey: boolean
  isEnabled: boolean
}
