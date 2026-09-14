import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AegisData from './AegisData.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AegisData />
  </StrictMode>,
)
