import L from 'leaflet';

export function createNumberedIcon(number: number, color: string) {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${number}</div>`,
    iconSize: [32, 32],
    className: 'numbered-marker',
  });
}

export function createDestinationIcon(label: string) {
  const bgColor = '#3b82f6';
  return L.divIcon({
    html: `<div style="
      background-color: ${bgColor};
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${label}</div>`,
    className: 'destination-marker',
    iconAnchor: [60, 0],
  });
}
