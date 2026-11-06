package org.example.diagnosticService.repositories;

import org.example.diagnosticService.entities.DiagnosticOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiagnosticOrderRepository extends JpaRepository<DiagnosticOrder, String> {
}