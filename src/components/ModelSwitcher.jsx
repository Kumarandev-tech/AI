import { useEffect, useRef } from 'react'
import { modelDefaults, providerIds } from '../config/models'

export default function ModelSwitcher({ provider, modelConfigs, modelOptions = [], modelListState, onRefreshModels, onProviderChange, onModelConfigChange }) {
  const settingsRef = useRef(null)
  const config = modelConfigs[provider] || modelDefaults[provider]

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (settingsRef.current?.open && !settingsRef.current.contains(event.target)) settingsRef.current.open = false
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && settingsRef.current?.open) settingsRef.current.open = false
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div className="qoruz-model-switcher" aria-label="AI model settings">
      <details ref={settingsRef} className="qoruz-model-switcher__settings">
        <summary title="Choose AI provider and model">
          <span className="qoruz-model-switcher__summary-provider"><i aria-hidden="true" />{modelDefaults[provider].label}</span>
          <span className="qoruz-model-switcher__summary-model">{config.model || 'Choose model'}</span>
          <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
        </summary>
        <div className="qoruz-model-switcher__panel">
          <div className="qoruz-model-switcher__panel-heading">
            <strong>AI model</strong>
            <span>Choose a provider and model</span>
          </div>
          <label>
            <span>Provider</span>
            <select aria-label="Choose AI model provider" value={provider} onChange={(event) => onProviderChange(event.target.value)}>
              {providerIds.map((id) => <option key={id} value={id}>{modelDefaults[id].label}</option>)}
            </select>
          </label>
          <label>
            <span>Available models</span>
            <select
              aria-label={`Choose an available ${modelDefaults[provider].label} model`}
              value={modelOptions.includes(config.model) ? config.model : ''}
              onChange={(event) => event.target.value && onModelConfigChange(provider, 'model', event.target.value)}
              disabled={modelListState?.status === 'loading'}
            >
              <option value="">{modelListState?.status === 'loading' ? 'Loading models…' : modelOptions.length ? 'Select a model' : 'No models listed'}</option>
              {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          <div className="qoruz-model-switcher__model-actions">
            <span role="status" aria-live="polite">
              {modelListState?.status === 'loaded'
                ? `${modelOptions.length} model${modelOptions.length === 1 ? '' : 's'} available`
                : modelListState?.status === 'error' ? modelListState.error : ''}
            </span>
            <button type="button" onClick={onRefreshModels} disabled={modelListState?.status === 'loading'}>
              <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M13 5V2m0 3h-3M3 11v3m0-3h3M3.7 6a4.5 4.5 0 0 1 7.6-1.8L13 5M3 11l1.7 1.8A4.5 4.5 0 0 0 12.3 10" /></svg>
              Refresh
            </button>
          </div>
          <label>
            <span>Model name (or enter one manually)</span>
            <input
              aria-label={`${modelDefaults[provider].label} model name`}
              value={config.model}
              placeholder={provider === 'ollama' ? 'e.g. gpt-oss:120b' : provider === 'groq' ? 'e.g. openai/gpt-oss-120b' : 'e.g. gemini-2.5-flash'}
              onChange={(event) => onModelConfigChange(provider, 'model', event.target.value)}
            />
          </label>
        </div>
      </details>
    </div>
  )
}
