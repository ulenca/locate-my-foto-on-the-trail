import { Routes } from '@angular/router';
import { ImportWorkspace } from './features/import-workspace/import-workspace';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'import-workspace' },
    {path: 'import-workspace', component: ImportWorkspace},
    { path: '**', redirectTo: 'import-workspace' },
];
