import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { getBaseURL } from './api/Request'

// 动态注入 Dify 聊天机器人配置，地址跟随 Request.ts 的环境配置
const difyBaseUrl = getBaseURL('dify')
;(window as any).difyChatbotConfig = {
  token: 'eNgQgtBHcr4m7qgQ',
  baseUrl: difyBaseUrl,
  inputs: {},
  systemVariables: {},
  userVariables: {}
}

// 动态加载 Dify embed 脚本
const existingScript = document.getElementById('eNgQgtBHcr4m7qgQ')
if (!existingScript) {
  const script = document.createElement('script')
  script.src = `${difyBaseUrl}/embed.min.js`
  script.id = 'eNgQgtBHcr4m7qgQ'
  script.defer = true
  document.head.appendChild(script)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
