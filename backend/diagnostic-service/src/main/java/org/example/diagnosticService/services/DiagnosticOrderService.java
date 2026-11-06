package org.example.diagnosticService.services;

import org.example.diagnosticService.entities.DiagnosticOrder;
import org.example.diagnosticService.repositories.DiagnosticOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DiagnosticOrderService {
    @Autowired
    private DiagnosticOrderRepository repository;

    public List<DiagnosticOrder> findAll() { return repository.findAll(); }
    public DiagnosticOrder findById(String id) { return repository.findById(id).orElse(null); }
    public DiagnosticOrder save(DiagnosticOrder order) {
        if (order != null && order.getOrderDate() != null) {
            // Guard against client/server clock skew causing @PastOrPresent failures.
            LocalDateTime now = LocalDateTime.now();
            if (order.getOrderDate().isAfter(now)) {
                order.setOrderDate(now.minusMinutes(2));
            }
        }
        return repository.save(order);
    }
    public void deleteById(String id) { repository.deleteById(id); }
}