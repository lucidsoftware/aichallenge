import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BracketComponent} from './bracket/bracket.component';
import {HomeComponent} from './home/home.component';
import {MeleeComponent} from './melee/melee.component';
import {LobbyClient} from './net/lobbyclient';
import {PracticeComponent} from './practice/practice.component';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        BracketComponent,
        MeleeComponent,
        PracticeComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
    ],
    providers: [
        LobbyClient,
    ],
    bootstrap: [
        AppComponent,
    ]
})
export class AppModule {}
