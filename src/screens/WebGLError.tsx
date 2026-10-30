export function WebGLError() {
  return (
    <div className="screen screen-center">
      <div className="panel error-box">
        <p className="eyebrow">Renderer offline</p>
        <h1 className="title">WebGL unavailable</h1>
        <p className="subtitle">
          Neon Rush needs hardware-accelerated WebGL. Enable GPU acceleration, update your browser, or try another
          device, then reload.
        </p>
      </div>
    </div>
  )
}
