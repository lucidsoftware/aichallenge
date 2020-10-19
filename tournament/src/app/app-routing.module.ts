import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {BracketComponent} from './bracket/bracket.component';
import {HomeComponent} from './home/home.component';
import {MeleeComponent} from './melee/melee.component';
import {PracticeComponent} from './practice/practice.component';

const routes: Routes = [
    {path: 'bracket/:name/melee', component: MeleeComponent},
    {path: 'bracket/:name', component: BracketComponent},
    {path: 'practice', component: PracticeComponent},
    {path: '', component: HomeComponent},
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {
        useHash: true,
    })],
    exports: [RouterModule]
})
export class AppRoutingModule {}
