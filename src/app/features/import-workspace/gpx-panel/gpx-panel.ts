import { Component, EventEmitter, Output } from '@angular/core';

export type GpxTrackPoint = Readonly<{
  time: Date;
  latitude: number;
  longitude: number;
}>;

export type GpxTrack = Readonly<{
  fileName: string;
  points: GpxTrackPoint[];
}>;

@Component({
  selector: 'app-gpx-panel',
  standalone: true,
  templateUrl: './gpx-panel.html',
})
export class GpxPanelComponent {
  @Output() trackLoaded = new EventEmitter<GpxTrack>();

  isReadingGpx = false;
  fileName: string | null = null;
  points: GpxTrackPoint[] = [];

  async onGpxSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = (input.files ?? [])[0];

    if (!file) {
      this.fileName = null;
      this.points = [];
      return;
    }

    this.isReadingGpx = true;
    this.fileName = file.name;

    try {
      const xmlText = await file.text();
      this.points = this.parseGpxTrackPoints(xmlText);

      this.trackLoaded.emit({
        fileName: this.fileName,
        points: this.points,
      });
    } finally {
      this.isReadingGpx = false;
      input.value = '';
    }
    
  }

  private parseGpxTrackPoints(xmlText: string): GpxTrackPoint[] {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const trkpts = Array.from(doc.getElementsByTagName('trkpt'));

    const points: GpxTrackPoint[] = [];

    for (const trkpt of trkpts) {
      const latAttr = trkpt.getAttribute('lat');
      const lonAttr = trkpt.getAttribute('lon');
      const timeEl = trkpt.getElementsByTagName('time')[0];

      if (!latAttr || !lonAttr || !timeEl?.textContent) continue;

      const latitude = Number(latAttr);
      const longitude = Number(lonAttr);
      const time = new Date(timeEl.textContent);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Number.isNaN(time.getTime())
      ) {
        continue;
      }

      points.push({ time, latitude, longitude });
    }

    points.sort((a, b) => a.time.getTime() - b.time.getTime());
    return points;
  }

  get svgPolylinePoints(): string {
  if (this.points.length < 2) return '';

  // Downsampling: maks ~800 punktów, żeby nie zabić DOM
  const maxPoints = 800;
  const step = Math.max(1, Math.floor(this.points.length / maxPoints));
  const sampled = this.points.filter((_, idx) => idx % step === 0);

  const lats = sampled.map(p => p.latitude);
  const lons = sampled.map(p => p.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const width = 300;
  const height = 180;
  const padding = 8;

  const lonSpan = maxLon - minLon || 1;
  const latSpan = maxLat - minLat || 1;

  return sampled.map(p => {
    const x = padding + ((p.longitude - minLon) / lonSpan) * (width - 2 * padding);
    // SVG ma oś Y w dół, więc odwracamy latitude
    const y = padding + ((maxLat - p.latitude) / latSpan) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
}