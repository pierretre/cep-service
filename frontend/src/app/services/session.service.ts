import { Injectable, signal } from '@angular/core';
import { v4 as UUID } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private uuid: string | null = UUID();

  getUser() {
    return this.uuid;
  }

  clearSession() {
    this.uuid = null;
  }
}