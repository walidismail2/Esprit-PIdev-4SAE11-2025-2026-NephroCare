package org.example.monitoringService.exceptions;

public class AlertNotFoundException extends RuntimeException {
    public AlertNotFoundException(String id) {
        super("Alerte introuvable avec l'ID : " + id);
    }
}