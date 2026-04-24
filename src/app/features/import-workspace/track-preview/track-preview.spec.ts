import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackPreview } from './track-preview';

describe('TrackPreview', () => {
  let component: TrackPreview;
  let fixture: ComponentFixture<TrackPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackPreview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
