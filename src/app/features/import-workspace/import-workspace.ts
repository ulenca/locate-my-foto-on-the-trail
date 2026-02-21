import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, PLATFORM_ID, inject } from '@angular/core';
import { GeoCoordinate } from '../../domain/geo-coordinate';
import { PhotoAsset, TakenAtSource } from '../../domain/photo-asset';
import { PhotoPreviewComponent } from './photo-preview/photo-preview';

@Component({
  selector: 'app-import-workspace',
  imports: [PhotoPreviewComponent, CommonModule],
  templateUrl: './import-workspace.html',
  styleUrl: './import-workspace.scss',
})
export class ImportWorkspace {
  importedPhotos: PhotoAsset[] = [];
  isReadingExif = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  async onPhotosSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    const selectedFiles = Array.from(input.files ?? []).filter((file) => this.isJpeg(file));
console.log('Selected files:', Array.from(input.files ?? []).map(f => ({ name: f.name, type: f.type })));
console.log('Accepted JPEG files:', selectedFiles.map(f => ({ name: f.name, type: f.type })));
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

      this.importedPhotos = photos.sort((a, b) => a.file.name.localeCompare(b.file.name));
      console.log('Imported photos count:', this.importedPhotos.length, this.importedPhotos.map(p => p.file.name));
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
  timeoutMs
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
      mod?.default?.default?.default ??
      mod?.default?.default ??
      mod?.default ??
      mod;

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

    const candidate =
      exifCandidate ?? xmpCandidate ?? null;

    let takenAt: Date | null =
      candidate instanceof Date
        ? candidate
        : typeof candidate === 'string'
          ? new Date(candidate)
          : null;

    let takenAtSource: TakenAtSource =
      exifCandidate != null ? 'EXIF'
      : xmpCandidate != null ? 'XMP'
      : 'UNKNOWN';

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
}
