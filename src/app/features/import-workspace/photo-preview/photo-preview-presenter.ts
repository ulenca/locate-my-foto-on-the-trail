import { Injectable } from '@angular/core';
import { GeoCoordinate } from '../../../domain/geo-coordinate';
import { TakenAtSource } from '../../../domain/photo-asset';

@Injectable({
  providedIn: 'root',
})
export class PhotoPreviewPresenter {
  formatTakenAt(takenAt: Date | null): string {
    if (!takenAt) return '—';

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(takenAt);
  }

  formatLocation(location: GeoCoordinate | null): string {
    if (!location) return '—';
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  sourceLabel(source: TakenAtSource): string {
    switch (source) {
      case 'EXIF': return 'EXIF';
      case 'XMP': return 'XMP';
      case 'FILE_TIMESTAMP': return 'FILE';
      default: return '—';
    }
  }

  sourceBadgeClass(source: TakenAtSource): string {
    switch (source) {
      case 'EXIF':
        return 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30';
      case 'XMP':
        return 'bg-sky-500/15 text-sky-200 ring-sky-500/30';
      case 'FILE_TIMESTAMP':
        return 'bg-amber-500/15 text-amber-200 ring-amber-500/30';
      default:
        return 'bg-zinc-500/15 text-zinc-200 ring-zinc-500/30';
    }
  }
}
