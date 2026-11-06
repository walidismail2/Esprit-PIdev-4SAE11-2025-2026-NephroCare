package esprit.order_service.service;

import esprit.order_service.dto.DeliveryRequest;
import esprit.order_service.dto.DeliveryResponse;
import esprit.order_service.entity.Enumerations.DeliveryStatus;

import java.util.List;

public interface IDeliveryService {
    DeliveryResponse  createDelivery(DeliveryRequest request);
    List<DeliveryResponse> getAllDeliveries();
    List<DeliveryResponse> getDeliveriesByPatient(String patientId);
    List<DeliveryResponse> getDeliveriesByDriver(String driverName);
    DeliveryResponse  getDeliveryByOrder(String orderId);
    DeliveryResponse  updateStatus(String id, DeliveryStatus status);
    DeliveryResponse  getById(String id);
}
