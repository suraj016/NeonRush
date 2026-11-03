import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import './styles/global.css'
import characterUrl from './assets/models/Characternew.fbx?url'
import { beginMixamoPrefetch, preloadMixamoAvatar } from './game/mixamoCharacter.ts'

beginMixamoPrefetch(characterUrl)
void preloadMixamoAvatar(characterUrl)

const root = document.getElementById('root')
if (!root) throw new Error('Neon Rush failed to find the root element.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
