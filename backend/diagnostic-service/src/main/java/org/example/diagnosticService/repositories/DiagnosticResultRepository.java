package org.example.diagnosticService.repositories;

import org.example.diagnosticService.entities.DiagnosticResult;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiagnosticResultRepository extends JpaRepository<DiagnosticResult, String> {
}