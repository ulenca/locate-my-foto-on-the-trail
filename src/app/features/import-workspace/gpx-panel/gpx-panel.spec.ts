import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GpxPanel } from './gpx-panel';

describe('GpxPanel', () => {
  let component: GpxPanel;
  let fixture: ComponentFixture<GpxPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GpxPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GpxPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
