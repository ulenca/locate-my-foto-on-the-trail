import JSZip from 'jszip';
import piexif from 'piexifjs';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, PLATFORM_ID, inject } from '@angular/core';
import { GeoCoordinate } from '../../domain/geo-coordinate';
import { PhotoAsset, TakenAtSource } from '../../domain/photo-asset';
import { PhotoPreviewComponent } from './photo-preview/photo-preview';
import { GpxPanelComponent, GpxTrack } from './gpx-panel/gpx-panel';
import { TrackPreviewComponent } from './track-preview/track-preview';


@Component({
  selector: 'app-import-workspace',
  imports: [PhotoPreviewComponent, CommonModule, TrackPreviewComponent, GpxPanelComponent],
  templateUrl: './import-workspace.html',
  styleUrl: './import-workspace.scss',
})
export class ImportWorkspace {
  importedPhotos: PhotoAsset[] = [];
  isReadingExif = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  gpxTrack: GpxTrack | null = null;

onTrackLoaded(track: GpxTrack): void {
  this.gpxTrack = track;
}

  async onPhotosSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    const selectedFiles = Array.from(input.files ?? []).filter((file) => this.isJpeg(file));
    console.log(
      'Selected files:',
      Array.from(input.files ?? []).map((f) => ({ name: f.name, type: f.type })),
    );
    console.log(
      'Accepted JPEG files:',
      selectedFiles.map((f) => ({ name: f.name, type: f.type })),
    );
    if (selectedFiles.length === 0) {
      this.importedPhotos = [];
      return;
    }

    this.isReadingExif = true;

    console.time('exif-read');
    try {
      const results = await Promise.allSettled(
        selectedFiles.map((file) => this.readPhotoAssetWithTimeout(file, 8000)),
      );

      const photos = results
        .filter((r): r is PromiseFulfilledResult<PhotoAsset> => r.status === 'fulfilled')
        .map((r) => r.value);

this.importedPhotos = photos.sort((a, b) => {
  const at = a.takenAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bt = b.takenAt?.getTime() ?? Number.POSITIVE_INFINITY;

  if (at !== bt) return at - bt;
  return a.file.name.localeCompare(b.file.name);
});
      console.log(
        'Imported photos count:',
        this.importedPhotos.length,
        this.importedPhotos.map((p) => p.file.name),
      );
      console.timeEnd('exif-read');
    } finally {
      this.isReadingExif = false;
      input.value = '';
      this.cdr.detectChanges(); // wymusza odświeżenie UI
    }
  }

  private readPhotoAssetWithTimeout(file: File, timeoutMs: number): Promise<PhotoAsset> {
    return Promise.race([
      this.readPhotoAsset(file),
      new Promise<PhotoAsset>((resolve) => {
        window.setTimeout(
          () => resolve({ file, takenAt: null, takenAtSource: 'UNKNOWN', location: null }),
          timeoutMs,
        );
      }),
    ]);
  }

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

  private isJpeg(file: File): boolean {
    const lowerName = file.name.toLowerCase();
    return file.type === 'image/jpeg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
  }

  private async readPhotoAsset(file: File): Promise<PhotoAsset> {
    if (!isPlatformBrowser(this.platformId)) {
      return { file, takenAt: null, takenAtSource: 'UNKNOWN', location: null };
    }

    try {
      const mod: any = await import('exifr');
      const exifr: any =
        mod?.default?.default?.default ?? mod?.default?.default ?? mod?.default ?? mod;

      const buffer = await file.arrayBuffer();
      const parsed: any = await exifr.parse(buffer, true);

      // 1) wyciąganie czasu + źródła
      const exifCandidate =
        parsed?.DateTimeOriginal ??
        parsed?.CreateDate ??
        parsed?.DateTimeDigitized ??
        parsed?.exif?.DateTimeOriginal ??
        parsed?.exif?.CreateDate ??
        null;

      const xmpCandidate =
        parsed?.xmp?.DateTimeOriginal ??
        parsed?.xmp?.CreateDate ??
        parsed?.MetadataDate ?? // często XMP
        null;

      const candidate = exifCandidate ?? xmpCandidate ?? null;

      let takenAt: Date | null =
        candidate instanceof Date
          ? candidate
          : typeof candidate === 'string'
            ? new Date(candidate)
            : null;

      let takenAtSource: TakenAtSource =
        exifCandidate != null ? 'EXIF' : xmpCandidate != null ? 'XMP' : 'UNKNOWN';

      // Mega-fallback: timestamp pliku (systemowy)
      if (!takenAt) {
        takenAt = new Date(file.lastModified);
        takenAtSource = 'FILE_TIMESTAMP';
      }

      // 2) GPS (różne miejsca zależnie od merge)
      const lat = parsed?.latitude ?? parsed?.gps?.latitude ?? null;
      const lon = parsed?.longitude ?? parsed?.gps?.longitude ?? null;

      const location =
        typeof lat === 'number' && typeof lon === 'number'
          ? { latitude: lat, longitude: lon }
          : null;

      return { file, takenAt, takenAtSource, location };
    } catch (error) {
      console.warn('EXIF read failed for:', file.name, error);
      return { file, takenAt: null, takenAtSource: 'UNKNOWN', location: null };
    }
  }

  locatePhotos(): void {
  if (!this.gpxTrack || this.gpxTrack.points.length === 0) return;

  const trackPoints = this.gpxTrack.points;

  this.importedPhotos = this.importedPhotos.map((photo) => {
    if (photo.location) return photo;           // już ma lokalizację
    if (!photo.takenAt) return photo;           // brak czasu -> nie dopasujemy

    const nearest = this.findNearestTrackPointByTime(trackPoints, photo.takenAt);
    if (!nearest) return photo;

    return {
      ...photo,
      location: { latitude: nearest.latitude, longitude: nearest.longitude },
    };
  });
}

private findNearestTrackPointByTime(
  points: ReadonlyArray<{ time: Date; latitude: number; longitude: number }>,
  targetTime: Date,
): { time: Date; latitude: number; longitude: number } | null {
  // points są już posortowane po czasie w parseGpxTrackPoints()
  const target = targetTime.getTime();
  if (points.length === 0) return null;

  // binary search: pierwszy punkt z time >= target
  let lo = 0;
  let hi = points.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].time.getTime() < target) lo = mid + 1;
    else hi = mid;
  }

  const right = points[lo];
  const left = lo > 0 ? points[lo - 1] : null;

  if (!left) return right;

  const dLeft = Math.abs(left.time.getTime() - target);
  const dRight = Math.abs(right.time.getTime() - target);

  return dLeft <= dRight ? left : right;
}


//eskport zdjec
async downloadGeotaggedPhotosZip(): Promise<void> {
  if (this.importedPhotos.length === 0) return;

  const zip = new JSZip();

  for (const photo of this.importedPhotos) {
    const originalName = photo.file.name;
    const outputName = this.withSuffixBeforeExtension(originalName, '_geotagged');

    // jeśli nie mamy lokalizacji – wrzucamy oryginał (albo możesz pominąć)
    if (!photo.location) {
      zip.file(originalName, photo.file);
      continue;
    }

    // zapis GPS do EXIF
    const dataUrl = await this.readFileAsDataUrl(photo.file);
    const updatedDataUrl = this.writeGpsToJpegDataUrl(dataUrl, photo.location.latitude, photo.location.longitude);
    const updatedBlob = this.dataUrlToBlob(updatedDataUrl);

    zip.file(outputName, updatedBlob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  this.downloadBlob(zipBlob, 'geotagged-photos.zip');
}

private writeGpsToJpegDataUrl(dataUrl: string, lat: number, lon: number): string {
  const exifObj = piexif.load(dataUrl);

  const { ref: latRef, dms: latDms } = this.decimalToGpsDms(lat, true);
  const { ref: lonRef, dms: lonDms } = this.decimalToGpsDms(lon, false);

  exifObj['GPS'][piexif.GPSIFD.GPSLatitudeRef] = latRef;
  exifObj['GPS'][piexif.GPSIFD.GPSLatitude] = latDms;

  exifObj['GPS'][piexif.GPSIFD.GPSLongitudeRef] = lonRef;
  exifObj['GPS'][piexif.GPSIFD.GPSLongitude] = lonDms;

  // (opcjonalnie) GPSVersionID – często spotykane
  exifObj['GPS'][piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];

  const exifBytes = piexif.dump(exifObj);
  return piexif.insert(exifBytes, dataUrl);
}

private decimalToGpsDms(value: number, isLat: boolean): { ref: 'N' | 'S' | 'E' | 'W'; dms: [number, number][] } {
  const ref = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const abs = Math.abs(value);

  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  // piexif oczekuje rationali: [licznik, mianownik]
  const sec = this.toRational(seconds, 100); // dokładność 1/100 sekundy

  return {
    ref,
    dms: [
      [degrees, 1],
      [minutes, 1],
      sec,
    ],
  };
}

private toRational(value: number, denominator: number): [number, number] {
  const numerator = Math.round(value * denominator);
  return [numerator, denominator];
}

private readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

private dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? 'image/jpeg';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return new Blob([bytes], { type: mime });
}

private downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

private withSuffixBeforeExtension(name: string, suffix: string): string {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return `${name}${suffix}`;
  return `${name.slice(0, dot)}${suffix}${name.slice(dot)}`;
}
}
