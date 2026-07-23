import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global listener: Ngăn chặn cuộn chuột làm trôi/thay đổi giá trị của TẤT CẢ các ô input type="number"
document.addEventListener('wheel', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    target.blur();
  }
  if (
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.type === 'number'
  ) {
    document.activeElement.blur();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
