import { asset } from '../utils/assets.ts'

export function BootScreen() {
  return (
    <div
      className="screen screen-center boot"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(16, 41, 35, 0.35), rgba(16, 41, 35, 0.82)), url(${asset('assets/images/menu-keyart.jpg')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="panel" style={{ textAlign: 'center' }}>
        <img src={asset('assets/images/neon-rush-logo.jpg')} alt="Neon Rush" />
        <p className="eyebrow" style={{ marginTop: 16 }}>
          Initializing grid
        </p>
      </div>
    </div>
  )
}
