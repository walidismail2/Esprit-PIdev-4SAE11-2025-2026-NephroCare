package esprit.order_service.service;

import esprit.order_service.dto.OrderRequest;
import esprit.order_service.dto.OrderResponse;
import esprit.order_service.entity.Enumerations.OrderStatus;

import java.util.List;

public interface IOrderService {
    OrderResponse       createOrder(OrderRequest request);
    List<OrderResponse> getAllOrders();
    List<OrderResponse> getOrdersByPatient(String patientId);
    OrderResponse       getOrderById(String id);
    OrderResponse       updateStatus(String id, OrderStatus status);
    void                deleteOrder(String id);
    long                countByStatus(OrderStatus status);
}