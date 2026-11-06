import { Injectable } from '@angular/core';
import * as _SockJS from 'sockjs-client';
const SockJS = (_SockJS as any).default || _SockJS;

import { Client, IMessage } from '@stomp/stompjs';
import { Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AlertSocketService {

    private stompClient!: Client;

    private alertSubject = new Subject<any>();
    private criticalCountSubject = new BehaviorSubject<number>(0);
    private connectedSubject = new BehaviorSubject<boolean>(false);

    public alerts$ = this.alertSubject.asObservable();
    public criticalCount$ = this.criticalCountSubject.asObservable();
    public isConnected$ = this.connectedSubject.asObservable();

    setInitialCriticalCount(count: number) {
        this.criticalCountSubject.next(count);
    }

    connect() {

        // ⚠️ éviter double connexion
        if (this.stompClient && this.stompClient.active) {
            return;
        }

        this.stompClient = new Client({
            webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws-alerts`),

            reconnectDelay: 5000, // 🔥 plus rapide
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            debug: () => { } // silence logs
        });

        this.stompClient.onConnect = () => {
            console.log('✅ WebSocket CONNECTED');
            this.connectedSubject.next(true);

            this.stompClient.subscribe('/topic/alerts', (message: IMessage) => {
                try {
                    const alert = JSON.parse(message.body);

                    console.log('🚨 ALERT RECEIVED:', alert);

                    // 🔥 PUSH vers dashboard
                    this.alertSubject.next(alert);

                    // 🔥 Compteur CRITICAL
                    if (alert.severity === 'CRITICAL' && !alert.resolved) {
                        this.criticalCountSubject.next(
                            this.criticalCountSubject.value + 1
                        );

                        // 🔊 SON CRITICAL
                        this.playCriticalSound();
                    }

                } catch (e) {
                    console.error('❌ JSON parse error', e);
                }
            });
        };

        this.stompClient.onDisconnect = () => {
            console.warn('🔌 WebSocket DISCONNECTED');
            this.connectedSubject.next(false);
        };

        this.stompClient.onStompError = (frame) => {
            console.error('❌ STOMP ERROR:', frame.headers['message']);
            this.connectedSubject.next(false);
        };

        this.stompClient.onWebSocketClose = () => {
            console.warn('⚠️ WebSocket CLOSED');
            this.connectedSubject.next(false);
        };

        this.stompClient.activate();
    }

    disconnect() {
        if (this.stompClient) {
            this.stompClient.deactivate();
            this.connectedSubject.next(false);
        }
    }

    // 🔊 SOUND HANDLER (PRO)
    private playCriticalSound() {
        const audio = new Audio('assets/alarm.mp3');
        audio.play().catch(() => {
            console.warn('🔇 Autoplay bloqué par navigateur');
        });
    }
}