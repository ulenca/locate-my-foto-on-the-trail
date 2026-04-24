import { Component, Input } from '@angular/core';
import { GpxTrack } from '../gpx-panel/gpx-panel';
import { PhotoAsset } from '../../../domain/photo-asset';

type SvgMarker = Readonly<{ x: number; y: number; label: string }>;

@Component({
  selector: 'app-track-preview',
  standalone: true,
  templateUrl: './track-preview.html',
})
export class TrackPreviewComponent {
  @Input({ required: true }) track: GpxTrack | null = null;
  @Input({ required: true }) photos: PhotoAsset[] = [];

  get svgPolylinePoints(): string {
    const points = this.track?.points ?? [];
    if (points.length < 2) return '';

    const maxPoints = 1000;
    const step = Math.max(1, Math.floor(points.length / maxPoints));
    const sampled = points.filter((_, idx) => idx % step === 0);

    const lats = sampled.map((p) => p.latitude);
    const lons = sampled.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const width = 900;
    const height = 320;
    const padding = 12;

    const lonSpan = maxLon - minLon || 1;
    const latSpan = maxLat - minLat || 1;

    return sampled
      .map((p) => {
        const x = padding + ((p.longitude - minLon) / lonSpan) * (width - 2 * padding);
        const y = padding + ((maxLat - p.latitude) / latSpan) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  get svgMarkers(): SvgMarker[] {
    const trackPoints = this.track?.points ?? [];
    if (trackPoints.length < 2) return [];

    const width = 900;
    const height = 320;
    const padding = 12;

    const lats = trackPoints.map((p) => p.latitude);
    const lons = trackPoints.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const lonSpan = maxLon - minLon || 1;
    const latSpan = maxLat - minLat || 1;

    const toXy = (lat: number, lon: number) => {
      const x = padding + ((lon - minLon) / lonSpan) * (width - 2 * padding);
      const y = padding + ((maxLat - lat) / latSpan) * (height - 2 * padding);
      return { x, y };
    };

    const located = this.photos
      .map((p, idx) => ({ p, idx }))
      .filter((x) => x.p.location);

    return located.map(({ p, idx }) => {
      const loc = p.location!;
      const { x, y } = toXy(loc.latitude, loc.longitude);
      return { x, y, label: String(idx + 1) };
    });
  }
}